const Memory = require('../models/Memory');
const Group = require('../models/Group');
const fs = require('fs');
const path = require('path');

/**
 * GET /api/memories/:groupId
 * Get all memories for a group
 */
const getMemories = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
        if (!group.members.some(m => m.equals(userId))) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const memories = await Memory.find({ groupId })
            .populate('uploadedBy', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: memories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/memories/:groupId
 * Upload a new memory image
 */
const uploadMemory = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;
        const { caption } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image provided' });
        }

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
        if (!group.members.some(m => m.equals(userId))) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // The file is saved in 'uploads/'. We store the relative URL.
        const imageUrl = `/uploads/${req.file.filename}`;

        const memory = await Memory.create({
            groupId,
            uploadedBy: userId,
            imageUrl,
            caption: caption || '',
        });

        await memory.populate('uploadedBy', 'name email');

        res.status(201).json({ success: true, data: memory });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * DELETE /api/memories/:memoryId
 * Delete a memory (only the uploader or group owner can delete)
 */
const deleteMemory = async (req, res) => {
    try {
        const memory = await Memory.findById(req.params.id).populate('groupId');

        if (!memory) {
            return res.status(404).json({ success: false, message: 'Memory not found' });
        }

        const isUploader = memory.uploadedBy.equals(req.user._id);
        const isOwner = memory.groupId && memory.groupId.owner && memory.groupId.owner.equals(req.user._id);
        const isAdmin = memory.groupId && memory.groupId.admins && memory.groupId.admins.some(adminId => adminId.equals(req.user._id));

        if (!isUploader && !isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this memory' });
        }

        // Try to delete the file from filesystem
        try {
            const fileName = path.basename(memory.imageUrl);
            const filePath = path.join(__dirname, '../../uploads', fileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (err) {
            console.error('Failed to delete file:', err);
        }

        await memory.deleteOne();

        res.status(200).json({ success: true, data: req.params.id });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getMemories, uploadMemory, deleteMemory };
