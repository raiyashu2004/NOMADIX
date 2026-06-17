const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema(
    {
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Group',
            required: true,
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        imageUrl: {
            type: String,
            required: [true, 'Image URL is required'],
        },
        caption: {
            type: String,
            trim: true,
            maxlength: [200, 'Caption cannot exceed 200 characters'],
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

const Memory = mongoose.model('Memory', memorySchema);

module.exports = Memory;
