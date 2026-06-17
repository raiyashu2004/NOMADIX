const mongoose = require('mongoose');

const availabilitySchema = mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    availableDates: [{ type: String }] // Array of YYYY-MM-DD strings
}, { timestamps: true });

// One availability document per user per group
availabilitySchema.index({ groupId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Availability', availabilitySchema);
