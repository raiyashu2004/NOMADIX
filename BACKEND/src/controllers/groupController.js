const Group = require('../models/Group');
const crypto = require('crypto');

// ─── CONTROLLERS ─────────────────────────────────────────────────────────────

/**
 * @desc    Create a new travel group
 * @route   POST /api/groups
 * @access  Private
 *
 * Body: { name, description? }
 * Returns: group with unique inviteCode
 */
const createGroup = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Group name is required' });
        }

        // Generate a unique 6-character alphanumeric invite code
        const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();

        const group = await Group.create({
            name: name.trim(),
            description: description?.trim(),
            owner: req.user._id,
            admins: [],
            members: [req.user._id],
            inviteCode,
        });

        return res.status(201).json({
            success: true,
            message: 'Group created successfully',
            data: group,
        });
    } catch (error) {
        console.error('[createGroup]', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Join a group using its invite code
 * @route   POST /api/groups/join
 * @access  Private
 *
 * Body: { inviteCode }
 */
const joinGroup = async (req, res) => {
    try {
        const { inviteCode } = req.body;

        if (!inviteCode) {
            return res.status(400).json({ success: false, message: 'Invite code is required' });
        }

        const group = await Group.findOne({ inviteCode: inviteCode.toUpperCase() });
        if (!group) {
            return res.status(404).json({ success: false, message: 'Invalid invite code. Group not found.' });
        }

        // Idempotent: already a member
        if (group.members.some((m) => m.equals(req.user._id))) {
            return res.status(409).json({ success: false, message: 'You are already a member of this group' });
        }

        group.members.push(req.user._id);
        await group.save();

        const populated = await group.populate([
            { path: 'owner', select: 'name email' },
            { path: 'admins', select: 'name email' },
            { path: 'members', select: 'name email' },
        ]);

        return res.status(200).json({
            success: true,
            message: `You have joined "${group.name}"`,
            data: populated,
        });
    } catch (error) {
        console.error('[joinGroup]', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get groups the authenticated user belongs to
 * @route   GET /api/groups
 * @access  Private
 */
const getMyGroups = async (req, res) => {
    try {
        const groups = await Group.find({ members: req.user._id })
            .populate('owner', 'name email')
            .populate('admins', 'name email')
            .populate('members', 'name email')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: { count: groups.length, groups },
        });
    } catch (error) {
        console.error('[getMyGroups]', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get single group details by ID
 * @route   GET /api/groups/:id
 * @access  Private (members only)
 */
const getGroupDetails = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id)
            .populate('owner', 'name email')
            .populate('admins', 'name email')
            .populate('members', 'name email');

        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        const isMember = group.members.some((m) => m._id.equals(req.user._id));
        if (!isMember) {
            return res.status(403).json({ success: false, message: 'Access denied: not a member of this group' });
        }

        return res.status(200).json({ success: true, data: group });
    } catch (error) {
        console.error('[getGroupDetails]', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Leader starts the journey (REST alternative to socket)
 * @route   PATCH /api/groups/:id/start-journey
 * @access  Private (leader only)
 *
 * Body: { currentLocation? }
 * Also emits a Socket.io event to notify all room members.
 */
const startJourney = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        const isOwner = group.owner.equals(req.user._id);
        const isAdmin = group.admins.some(adminId => adminId.equals(req.user._id));

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only the owner or admins can start the journey',
            });
        }

        if (group.journeyStarted) {
            return res.status(409).json({ success: false, message: 'Journey has already been started' });
        }

        group.journeyStarted = true;
        group.currentLocation = req.body.currentLocation || 'Starting Point';
        await group.save();

        // Emit real-time event via Socket.io attached to app
        const io = req.app.get('io');
        if (io) {
            io.to(group._id.toString()).emit('journey_started', {
                groupId: group._id,
                message: 'The journey has officially started!',
                currentLocation: group.currentLocation,
                startedAt: new Date().toISOString(),
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Journey started! All members have been notified.',
            data: group,
        });
    } catch (error) {
        console.error('[startJourney]', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Leader updates the group's current live location
 * @route   PATCH /api/groups/:id/location
 * @access  Private (leader only)
 *
 * Body: { currentLocation }
 */
const updateLocation = async (req, res) => {
    try {
        const { currentLocation } = req.body;

        if (!currentLocation) {
            return res.status(400).json({ success: false, message: 'currentLocation is required' });
        }

        const group = await Group.findById(req.params.id);
        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        const isOwner = group.owner.equals(req.user._id);
        const isAdmin = group.admins.some(adminId => adminId.equals(req.user._id));

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only the owner or admins can update the location',
            });
        }

        if (!group.journeyStarted) {
            return res.status(400).json({ success: false, message: 'Journey has not been started yet' });
        }

        group.currentLocation = currentLocation;
        await group.save();

        // Emit via Socket.io
        const io = req.app.get('io');
        if (io) {
            io.to(group._id.toString()).emit('location_updated', {
                groupId: group._id,
                newLocation: currentLocation,
                updatedAt: new Date().toISOString(),
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Location updated and members notified.',
            data: { currentLocation: group.currentLocation },
        });
    } catch (error) {
        console.error('[updateLocation]', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Remove a member from the group (leader only)
 * @route   DELETE /api/groups/:id/members/:memberId
 * @access  Private (leader only)
 */
const removeMember = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        const isOwner = group.owner.equals(req.user._id);
        const isAdmin = group.admins.some(adminId => adminId.equals(req.user._id));

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Only the owner or admins can remove members' });
        }

        const targetIsOwner = group.owner.equals(req.params.memberId);
        const targetIsAdmin = group.admins.some(adminId => adminId.equals(req.params.memberId));

        if (targetIsOwner) {
            return res.status(400).json({ success: false, message: 'Owner cannot be removed' });
        }

        if (isAdmin && targetIsAdmin && !isOwner) {
            return res.status(403).json({ success: false, message: 'Admins cannot remove other admins' });
        }

        const before = group.members.length;
        group.members = group.members.filter((m) => !m.equals(req.params.memberId));
        group.admins = group.admins.filter((a) => !a.equals(req.params.memberId));

        if (group.members.length === before) {
            return res.status(404).json({ success: false, message: 'Member not found in this group' });
        }

        await group.save();

        return res.status(200).json({ success: true, message: 'Member removed from the group' });
    } catch (error) {
        console.error('[removeMember]', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const promoteToAdmin = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
        
        if (!group.owner.equals(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Only the owner can manage admins' });
        }

        const memberId = req.params.memberId;
        if (!group.members.some(m => m.equals(memberId))) {
            return res.status(400).json({ success: false, message: 'User is not a member' });
        }
        if (group.owner.equals(memberId)) {
            return res.status(400).json({ success: false, message: 'Owner cannot be an admin' });
        }
        if (group.admins.some(a => a.equals(memberId))) {
            return res.status(400).json({ success: false, message: 'User is already an admin' });
        }
        if (group.admins.length >= 2) {
            return res.status(400).json({ success: false, message: 'A party can have up to 2 Admins' });
        }

        group.admins.push(memberId);
        await group.save();
        return res.status(200).json({ success: true, message: 'Member promoted to admin' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const demoteAdmin = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

        if (!group.owner.equals(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Only the owner can manage admins' });
        }

        const memberId = req.params.memberId;
        if (!group.admins.some(a => a.equals(memberId))) {
            return res.status(400).json({ success: false, message: 'User is not an admin' });
        }

        group.admins = group.admins.filter(a => !a.equals(memberId));
        await group.save();
        return res.status(200).json({ success: true, message: 'Admin demoted to member' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const transferOwnership = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

        if (!group.owner.equals(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Only the owner can transfer ownership' });
        }

        const { newOwnerId } = req.body;
        if (!newOwnerId || !group.members.some(m => m.equals(newOwnerId))) {
            return res.status(400).json({ success: false, message: 'New owner must be an existing member' });
        }

        group.owner = newOwnerId;
        group.admins = group.admins.filter(a => !a.equals(newOwnerId));
        await group.save();
        return res.status(200).json({ success: true, message: 'Ownership transferred successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const leaveGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

        if (group.owner.equals(req.user._id)) {
            return res.status(400).json({ success: false, message: 'Owner must transfer ownership before leaving' });
        }

        group.members = group.members.filter(m => !m.equals(req.user._id));
        group.admins = group.admins.filter(a => !a.equals(req.user._id));
        await group.save();
        return res.status(200).json({ success: true, message: 'Left the party successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const deleteGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

        if (!group.owner.equals(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Only the owner can delete the party' });
        }

        await Group.deleteOne({ _id: req.params.id });
        return res.status(200).json({ success: true, message: 'Party deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createGroup,
    joinGroup,
    getMyGroups,
    getGroupDetails,
    startJourney,
    updateLocation,
    removeMember,
    promoteToAdmin,
    demoteAdmin,
    transferOwnership,
    leaveGroup,
    deleteGroup,
};
