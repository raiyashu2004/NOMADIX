const mongoose = require('mongoose');

const groupSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    leader: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    inviteCode: {
        type: String,
        required: true,
        unique: true
    },
    journeyStarted: {
        type: Boolean,
        default: false
    },
    currentLocation: {
        type: String,
        default: 'Not Started'
    },
    currentPhase: {
        type: String,
        enum: ['planning', 'survey', 'recommendations', 'voting', 'locked'],
        default: 'planning'
    }
}, {
    timestamps: true
});

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;
