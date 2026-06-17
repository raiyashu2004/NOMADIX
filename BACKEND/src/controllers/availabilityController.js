const Group = require('../models/Group');
const Availability = require('../models/Availability');

/**
 * POST /api/groups/:groupId/availability
 * Submit or update the authenticated user's available dates for a group.
 */
const updateAvailability = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;
        const { availableDates } = req.body; // Array of 'YYYY-MM-DD' strings

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
        
        if (!group.members.some(m => m.equals(userId))) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const availability = await Availability.findOneAndUpdate(
            { groupId, userId },
            { groupId, userId, availableDates },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const io = req.app.get('io');
        if (io) {
            io.to(groupId).emit('availability_updated', {
                groupId,
                userId,
                userName: req.user.name,
                availableDates
            });
        }

        res.status(200).json({ success: true, data: availability });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/groups/:groupId/availability
 * Get all members' availability for a group.
 */
const getAvailability = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        const group = await Group.findById(groupId).populate('members', 'name email');
        if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

        if (!group.members.some(m => m._id.equals(userId))) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const availabilities = await Availability.find({ groupId }).populate('userId', 'name');

        const data = availabilities.map(a => ({
            userId: a.userId._id,
            name: a.userId.name,
            availableDates: a.availableDates
        }));

        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { updateAvailability, getAvailability };
