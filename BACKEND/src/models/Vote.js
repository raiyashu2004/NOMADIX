const mongoose = require('mongoose');

const voteSchema = mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    destinationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
}, { timestamps: true });

// One vote per user per group (upsert to update)
voteSchema.index({ groupId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
