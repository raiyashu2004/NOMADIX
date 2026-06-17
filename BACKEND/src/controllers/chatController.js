const Message = require('../models/Message');

const getMessages = async (req, res) => {
    try {
        const { groupId } = req.params;
        // Get last 50 messages
        const messages = await Message.find({ groupId })
            .sort({ createdAt: 1 })
            .limit(50)
            .populate('senderId', 'name');

        res.status(200).json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const sendMessage = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { text } = req.body;
        const userId = req.user._id;

        if (!text || text.trim() === '') {
            return res.status(400).json({ success: false, message: 'Message text cannot be empty' });
        }

        const newMessage = await Message.create({
            groupId,
            senderId: userId,
            text
        });

        const populatedMessage = await newMessage.populate('senderId', 'name');

        const io = req.app.get('io');
        if (io) {
            io.to(groupId).emit('new_message', populatedMessage);
        }

        res.status(201).json({ success: true, data: populatedMessage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getMessages, sendMessage };
