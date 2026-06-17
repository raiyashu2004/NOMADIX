const mongoose = require('mongoose');

const itineraryItemSchema = mongoose.Schema({
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    day: {
        type: Number,
        default: 1
    },
    time: {
        type: String, // e.g., "10:00 AM" or "Morning"
        default: ''
    },
    location: {
        type: String,
        default: ''
    },
    lat: {
        type: Number
    },
    lng: {
        type: Number
    },
    costEstimate: {
        type: Number,
        default: 0
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('ItineraryItem', itineraryItemSchema);
