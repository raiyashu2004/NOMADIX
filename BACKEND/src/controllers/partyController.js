const Party = require('../models/Party');

// ─── SHARED HELPERS ───────────────────────────────────────────────────────────

/**
 * Fetch a party by ID and check it exists.
 * Sends 404 and returns null if not found.
 */
const findPartyOrFail = async (partyId, res, populateOptions = null) => {
    let query = Party.findById(partyId);
    if (populateOptions) query = query.populate(populateOptions);
    const party = await query;
    if (!party) {
        res.status(404).json({ success: false, message: 'Party not found' });
        return null;
    }
    return party;
};

/**
 * Standard populated query fields for party responses.
 */
const PARTY_POPULATE = [
    { path: 'leader', select: 'name email' },
    { path: 'members.user', select: 'name email' },
];

// ─── CONTROLLERS ─────────────────────────────────────────────────────────────

/**
 * @desc    Create a new party (the creator becomes leader automatically)
 * @route   POST /api/parties
 * @access  Private
 *
 * Body: { name, description?, destination?, maxMembers? }
 *
 * - Auto-generates a unique 8-char invite code (done in the model pre-save hook)
 * - Creator is added as the first member with role='leader'
 */
const createParty = async (req, res) => {
    try {
        const { name, description, destination, maxMembers } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Party name is required' });
        }

        const party = await Party.create({
            name: name.trim(),
            description: description?.trim(),
            destination: destination?.trim(),
            maxMembers: maxMembers || 20,
            leader: req.user._id,
            // Leader is inserted as first member with leader role
            members: [{ user: req.user._id, role: 'leader', joinedAt: new Date() }],
        });

        // Re-fetch with populated fields for a complete response
        const populated = await Party.findById(party._id).populate(PARTY_POPULATE);

        return res.status(201).json({
            success: true,
            message: 'Party created successfully',
            data: populated,
        });
    } catch (error) {
        console.error('[createParty]', error);
        if (error.name === 'ValidationError') {
            const msgs = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ success: false, errors: msgs });
        }
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * @desc    Join a party using its invite code
 * @route   POST /api/parties/join
 * @access  Private
 *
 * Body: { inviteCode }
 *
 * Guards:
 *  - Invalid code → 404
 *  - Already a member → 409
 *  - Party is full → 403
 *  - Party not open (active/closed) → 403
 */
const joinParty = async (req, res) => {
    try {
        const { inviteCode } = req.body;

        if (!inviteCode) {
            return res.status(400).json({ success: false, message: 'Invite code is required' });
        }

        // Case-insensitive lookup
        const party = await Party.findOne({
            inviteCode: inviteCode.toUpperCase().trim(),
        }).populate(PARTY_POPULATE);

        if (!party) {
            return res.status(404).json({
                success: false,
                message: 'Invalid invite code. No party found.',
            });
        }

        // Guard: party must be open for new members
        if (party.status !== 'open') {
            return res.status(403).json({
                success: false,
                message: `Cannot join — party is currently "${party.status}".`,
            });
        }

        // Guard: already a member
        if (party.hasMember(req.user._id)) {
            return res.status(409).json({
                success: false,
                message: 'You are already a member of this party',
            });
        }

        // Guard: capacity check
        if (party.isFull) {
            return res.status(403).json({
                success: false,
                message: `Party is full (${party.maxMembers}/${party.maxMembers} members)`,
            });
        }

        // Add new member
        party.members.push({ user: req.user._id, role: 'member', joinedAt: new Date() });
        await party.save();

        // Re-populate after save
        const populated = await Party.findById(party._id).populate(PARTY_POPULATE);

        return res.status(200).json({
            success: true,
            message: `You have joined "${party.name}"! 🎉`,
            data: populated,
        });
    } catch (error) {
        console.error('[joinParty]', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * @desc    Get all parties the authenticated user is a member of
 * @route   GET /api/parties
 * @access  Private
 */
const getMyParties = async (req, res) => {
    try {
        const parties = await Party.find({ 'members.user': req.user._id })
            .populate(PARTY_POPULATE)
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: { count: parties.length, parties },
        });
    } catch (error) {
        console.error('[getMyParties]', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * @desc    Get a specific party's details
 * @route   GET /api/parties/:partyId
 * @access  Private (members only)
 */
const getPartyDetails = async (req, res) => {
    try {
        const party = await findPartyOrFail(req.params.partyId, res, PARTY_POPULATE);
        if (!party) return;

        if (!party.hasMember(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied — you are not a member of this party',
            });
        }

        return res.status(200).json({ success: true, data: party });
    } catch (error) {
        console.error('[getPartyDetails]', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * @desc    Leader kicks a member out of the party
 * @route   DELETE /api/parties/:partyId/members/:memberId
 * @access  Private (leader only)
 *
 * Guards:
 *  - Only leader can call this
 *  - Leader cannot kick themselves
 *  - Target must be a current member
 */
const kickMember = async (req, res) => {
    try {
        const party = await findPartyOrFail(req.params.partyId, res);
        if (!party) return;

        // Only leader can kick
        if (!party.isLeader(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Only the party leader can remove members',
            });
        }

        const { memberId } = req.params;

        // Leader cannot kick themselves
        if (party.leader.equals(memberId)) {
            return res.status(400).json({
                success: false,
                message: 'Leader cannot kick themselves. Transfer leadership first.',
            });
        }

        const before = party.members.length;
        party.members = party.members.filter((m) => !m.user.equals(memberId));

        if (party.members.length === before) {
            return res.status(404).json({
                success: false,
                message: 'Member not found in this party',
            });
        }

        await party.save();

        return res.status(200).json({
            success: true,
            message: 'Member has been removed from the party',
            data: { remainingMembers: party.members.length },
        });
    } catch (error) {
        console.error('[kickMember]', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * @desc    Authenticated user voluntarily leaves the party
 * @route   POST /api/parties/:partyId/leave
 * @access  Private (members only)
 *
 * Guard: Leader must transfer leadership before leaving.
 */
const leaveParty = async (req, res) => {
    try {
        const party = await findPartyOrFail(req.params.partyId, res);
        if (!party) return;

        if (!party.hasMember(req.user._id)) {
            return res.status(400).json({ success: false, message: 'You are not a member of this party' });
        }

        // Leader must hand off before leaving
        if (party.isLeader(req.user._id)) {
            return res.status(400).json({
                success: false,
                message: 'You are the leader. Transfer leadership to another member before leaving.',
            });
        }

        party.members = party.members.filter((m) => !m.user.equals(req.user._id));
        await party.save();

        return res.status(200).json({
            success: true,
            message: `You have left "${party.name}"`,
        });
    } catch (error) {
        console.error('[leaveParty]', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * @desc    Transfer leadership to another party member
 * @route   PATCH /api/parties/:partyId/transfer-leadership
 * @access  Private (leader only)
 *
 * Body: { newLeaderId }
 */
const transferLeadership = async (req, res) => {
    try {
        const party = await findPartyOrFail(req.params.partyId, res);
        if (!party) return;

        if (!party.isLeader(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Only the current leader can transfer leadership',
            });
        }

        const { newLeaderId } = req.body;
        if (!newLeaderId) {
            return res.status(400).json({ success: false, message: 'newLeaderId is required' });
        }

        if (!party.hasMember(newLeaderId)) {
            return res.status(400).json({
                success: false,
                message: 'The new leader must be an existing party member',
            });
        }

        if (party.leader.equals(newLeaderId)) {
            return res.status(400).json({ success: false, message: 'This user is already the leader' });
        }

        // Demote old leader → member
        const oldLeader = party.members.find((m) => m.user.equals(req.user._id));
        if (oldLeader) oldLeader.role = 'member';

        // Promote new leader
        const newLeader = party.members.find((m) => m.user.equals(newLeaderId));
        if (newLeader) newLeader.role = 'leader';

        // Update leader reference
        party.leader = newLeaderId;
        await party.save();

        const populated = await Party.findById(party._id).populate(PARTY_POPULATE);

        return res.status(200).json({
            success: true,
            message: 'Leadership transferred successfully',
            data: populated,
        });
    } catch (error) {
        console.error('[transferLeadership]', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * @desc    Leader updates party status (open → active → closed)
 * @route   PATCH /api/parties/:partyId/status
 * @access  Private (leader only)
 *
 * Body: { status: 'open' | 'active' | 'closed' }
 *
 * Status rules:
 *  open   → active  ✅  (journey starts, members locked)
 *  active → closed  ✅  (journey ends)
 *  closed → *       ❌  (terminal state)
 *  active → open    ❌  (no going back once active)
 */
const updatePartyStatus = async (req, res) => {
    try {
        const party = await findPartyOrFail(req.params.partyId, res);
        if (!party) return;

        if (!party.isLeader(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Only the party leader can change the status',
            });
        }

        const { status } = req.body;
        const validTransitions = { open: ['active'], active: ['closed'] };

        if (!status) {
            return res.status(400).json({ success: false, message: 'status is required' });
        }

        if (party.status === 'closed') {
            return res.status(400).json({
                success: false,
                message: 'This party is closed and cannot be changed',
            });
        }

        const allowed = validTransitions[party.status];
        if (!allowed || !allowed.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot transition from "${party.status}" to "${status}". Allowed: ${allowed?.join(', ') || 'none'}`,
            });
        }

        party.status = status;

        // If activating, record the journey start time
        if (status === 'active') {
            party.journeyStartedAt = new Date();

            // Emit real-time Socket.io event to all party room members
            const io = req.app.get('io');
            if (io) {
                io.to(party._id.toString()).emit('party_status_changed', {
                    partyId: party._id,
                    status: 'active',
                    message: `"${party.name}" journey has started!`,
                    startedAt: party.journeyStartedAt,
                });
            }
        }

        if (status === 'closed') {
            const io = req.app.get('io');
            if (io) {
                io.to(party._id.toString()).emit('party_status_changed', {
                    partyId: party._id,
                    status: 'closed',
                    message: `"${party.name}" has been closed.`,
                });
            }
        }

        await party.save();

        return res.status(200).json({
            success: true,
            message: `Party status updated to "${status}"`,
            data: { status: party.status, journeyStartedAt: party.journeyStartedAt },
        });
    } catch (error) {
        console.error('[updatePartyStatus]', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * @desc    Regenerate the invite code (leader only)
 * @route   PATCH /api/parties/:partyId/regenerate-code
 * @access  Private (leader only)
 *
 * Useful when the code has been shared with the wrong people.
 */
const regenerateInviteCode = async (req, res) => {
    try {
        const party = await findPartyOrFail(req.params.partyId, res);
        if (!party) return;

        if (!party.isLeader(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Only the leader can regenerate the invite code',
            });
        }

        if (party.status !== 'open') {
            return res.status(400).json({
                success: false,
                message: 'Invite code can only be regenerated when the party is open',
            });
        }

        // Generate new unique code
        const crypto = require('crypto');
        let newCode;
        let exists = true;
        const Party = require('../models/Party');

        while (exists) {
            newCode = crypto.randomBytes(4).toString('hex').toUpperCase();
            exists = await Party.exists({ inviteCode: newCode, _id: { $ne: party._id } });
        }

        party.inviteCode = newCode;
        await party.save();

        return res.status(200).json({
            success: true,
            message: 'Invite code regenerated. Share the new code with your members.',
            data: { inviteCode: party.inviteCode },
        });
    } catch (error) {
        console.error('[regenerateInviteCode]', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * @desc    Get all members of a party with their roles
 * @route   GET /api/parties/:partyId/members
 * @access  Private (members only)
 */
const getPartyMembers = async (req, res) => {
    try {
        const party = await findPartyOrFail(req.params.partyId, res, [
            { path: 'members.user', select: 'name email' },
        ]);
        if (!party) return;

        if (!party.hasMember(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied — you are not a member',
            });
        }

        const memberList = party.members.map((m) => ({
            user: m.user,
            role: m.role,
            joinedAt: m.joinedAt,
            isLeader: m.role === 'leader',
        }));

        return res.status(200).json({
            success: true,
            data: {
                partyName: party.name,
                totalMembers: memberList.length,
                maxMembers: party.maxMembers,
                members: memberList,
            },
        });
    } catch (error) {
        console.error('[getPartyMembers]', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    createParty,
    joinParty,
    getMyParties,
    getPartyDetails,
    kickMember,
    leaveParty,
    transferLeadership,
    updatePartyStatus,
    regenerateInviteCode,
    getPartyMembers,
};
