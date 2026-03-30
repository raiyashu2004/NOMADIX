const Bill = require('../models/Bill');
const Group = require('../models/Group');

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Verify that the requesting user belongs to the given group.
 * Returns the group document on success, or sends an error response.
 *
 * @returns {object|null} group document or null (after sending HTTP error)
 */
const resolveGroupMembership = async (groupId, userId, res) => {
    const group = await Group.findById(groupId);
    if (!group) {
        res.status(404).json({ success: false, message: 'Group not found' });
        return null;
    }
    const isMember = group.members.some((m) => m.equals(userId));
    if (!isMember) {
        res.status(403).json({ success: false, message: 'Access denied: you are not a member of this group' });
        return null;
    }
    return group;
};

// ─── CONTROLLERS ─────────────────────────────────────────────────────────────

/**
 * @desc    Add a new bill to a group
 * @route   POST /api/bills
 * @access  Private (group members only)
 *
 * Body: { groupId, description, totalAmount, splitAmong? }
 *
 * splitAmong defaults to all current group members if not provided.
 * Each member's share = totalAmount / number of people in splitAmong.
 */
const addBill = async (req, res) => {
    try {
        const { groupId, description, totalAmount, splitAmong } = req.body;

        // ── Validation ────────────────────────────────────────────────────────
        if (!groupId || !description || totalAmount === undefined) {
            return res.status(400).json({
                success: false,
                message: 'groupId, description and totalAmount are required',
            });
        }

        if (typeof totalAmount !== 'number' || totalAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'totalAmount must be a positive number',
            });
        }

        // ── Auth: must be a group member ──────────────────────────────────────
        const group = await resolveGroupMembership(groupId, req.user._id, res);
        if (!group) return; // response already sent inside helper

        // ── Determine who shares the bill ────────────────────────────────────
        // Default: split among all group members
        const splitList =
            splitAmong && splitAmong.length > 0 ? splitAmong : group.members.map(String);

        // Validate every id in splitAmong is actually a group member
        const memberIds = group.members.map((m) => m.toString());
        const invalidIds = splitList.filter((id) => !memberIds.includes(id.toString()));
        if (invalidIds.length > 0) {
            return res.status(400).json({
                success: false,
                message: `These user IDs are not group members: ${invalidIds.join(', ')}`,
            });
        }

        const bill = await Bill.create({
            group: groupId,
            description: description.trim(),
            totalAmount,
            paidBy: req.user._id,
            splitAmong: splitList,
        });

        // Populate for a rich response
        const populated = await bill.populate([
            { path: 'paidBy', select: 'name email' },
            { path: 'splitAmong', select: 'name email' },
        ]);

        return res.status(201).json({ success: true, data: populated });
    } catch (error) {
        console.error('[addBill]', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get all bills for a group (paginated)
 * @route   GET /api/bills/group/:groupId?page=1&limit=20
 * @access  Private (group members only)
 */
const getGroupBills = async (req, res) => {
    try {
        const { groupId } = req.params;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);
        const skip = (page - 1) * limit;

        const group = await resolveGroupMembership(groupId, req.user._id, res);
        if (!group) return;

        const [bills, total] = await Promise.all([
            Bill.find({ group: groupId })
                .populate('paidBy', 'name email')
                .populate('splitAmong', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Bill.countDocuments({ group: groupId }),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                bills,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error) {
        console.error('[getGroupBills]', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Calculate settlement summary — who owes whom and how much
 * @route   GET /api/bills/group/:groupId/summary
 * @access  Private (group members only)
 *
 * Algorithm:
 *  1. For each bill: each person in splitAmong owes (totalAmount / splitAmong.length)
 *  2. Subtract what they already paid back
 *  3. Build a "net balance" map per user
 *  4. Use a greedy min-transactions algorithm to compute the fewest payments
 *
 * Example response:
 *  { settlements: [{ from: "Alice", to: "Bob", amount: 450 }] }
 */
const getSettlementSummary = async (req, res) => {
    try {
        const { groupId } = req.params;

        const group = await resolveGroupMembership(groupId, req.user._id, res);
        if (!group) return;

        const bills = await Bill.find({ group: groupId })
            .populate('paidBy', 'name email')
            .populate('splitAmong', 'name email');

        if (bills.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    totalExpenditure: 0,
                    perPersonSummary: [],
                    settlements: [],
                },
            });
        }

        // ── Step 1: Build net balance map { userId: netAmount } ───────────────
        // Positive balance  → others owe this person money
        // Negative balance  → this person owes others money
        const balances = {}; // { userId: { name, email, net: number } }

        const ensureKey = (user) => {
            const id = user._id.toString();
            if (!balances[id]) {
                balances[id] = { _id: id, name: user.name, email: user.email, net: 0 };
            }
        };

        let totalExpenditure = 0;

        for (const bill of bills) {
            const { paidBy, splitAmong, totalAmount } = bill;
            totalExpenditure += totalAmount;

            const share = parseFloat((totalAmount / splitAmong.length).toFixed(2));

            // Person who paid gains credit
            ensureKey(paidBy);
            balances[paidBy._id.toString()].net += totalAmount;

            // Each person in splitAmong loses their share
            for (const person of splitAmong) {
                ensureKey(person);
                balances[person._id.toString()].net -= share;
            }
        }

        const balanceList = Object.values(balances);

        // ── Step 2: Greedy min-cash-flow algorithm ────────────────────────────
        // Sort: creditors (positive) and debtors (negative)
        const settlements = [];
        const creditors = balanceList
            .filter((b) => b.net > 0.009) // ignore floating point dust
            .sort((a, b) => b.net - a.net);
        const debtors = balanceList
            .filter((b) => b.net < -0.009)
            .sort((a, b) => a.net - b.net);

        let ci = 0;
        let di = 0;

        while (ci < creditors.length && di < debtors.length) {
            const creditor = creditors[ci];
            const debtor = debtors[di];

            const settleable = Math.min(creditor.net, Math.abs(debtor.net));
            const rounded = parseFloat(settleable.toFixed(2));

            settlements.push({
                from: { _id: debtor._id, name: debtor.name, email: debtor.email },
                to: { _id: creditor._id, name: creditor.name, email: creditor.email },
                amount: rounded,
            });

            creditor.net -= settleable;
            debtor.net += settleable;

            if (creditor.net < 0.009) ci++;
            if (Math.abs(debtor.net) < 0.009) di++;
        }

        return res.status(200).json({
            success: true,
            data: {
                totalExpenditure: parseFloat(totalExpenditure.toFixed(2)),
                perPersonSummary: balanceList.map((b) => ({
                    ...b,
                    net: parseFloat(b.net.toFixed(2)),
                    status: b.net > 0 ? 'to_receive' : b.net < 0 ? 'to_pay' : 'settled',
                })),
                settlements,
            },
        });
    } catch (error) {
        console.error('[getSettlementSummary]', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Delete a bill (only the person who added it can delete)
 * @route   DELETE /api/bills/:billId
 * @access  Private
 */
const deleteBill = async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.billId);
        if (!bill) {
            return res.status(404).json({ success: false, message: 'Bill not found' });
        }

        if (!bill.paidBy.equals(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Only the person who added the bill can delete it',
            });
        }

        await bill.deleteOne();
        return res.status(200).json({ success: true, message: 'Bill deleted successfully' });
    } catch (error) {
        console.error('[deleteBill]', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { addBill, getGroupBills, getSettlementSummary, deleteBill };
