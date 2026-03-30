const mongoose = require('mongoose');

const billSchema = mongoose.Schema({
    group: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Group'
    },
    description: {
        type: String,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    paidBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    // We assume the split is equal among all specified members for simplicity
    splitAmong: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

const Bill = mongoose.model('Bill', billSchema);

module.exports = Bill;
