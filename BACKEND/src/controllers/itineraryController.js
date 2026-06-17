const ItineraryItem = require('../models/ItineraryItem');

const getItinerary = async (req, res) => {
    try {
        const { groupId } = req.params;
        const items = await ItineraryItem.find({ groupId }).sort({ day: 1, time: 1 }).populate('addedBy', 'name');
        res.status(200).json({ success: true, data: items });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const addItineraryItem = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { title, day, time } = req.body;
        const userId = req.user._id;

        const newItem = await ItineraryItem.create({
            groupId,
            title,
            day: day || 1,
            time: time || '',
            addedBy: userId
        });

        const populatedItem = await newItem.populate('addedBy', 'name');

        const io = req.app.get('io');
        if (io) {
            io.to(groupId).emit('itinerary_updated', {
                groupId,
                action: 'add',
                item: populatedItem
            });
        }

        res.status(201).json({ success: true, data: populatedItem });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteItineraryItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const item = await ItineraryItem.findById(itemId);

        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        await item.deleteOne();

        const io = req.app.get('io');
        if (io) {
            io.to(item.groupId.toString()).emit('itinerary_updated', {
                groupId: item.groupId,
                action: 'delete',
                itemId: item._id
            });
        }

        res.status(200).json({ success: true, message: 'Item removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getItinerary, addItineraryItem, deleteItineraryItem };
