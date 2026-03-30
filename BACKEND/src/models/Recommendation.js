const mongoose = require('mongoose');

const topDestinationSchema = mongoose.Schema({
    destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
    score: { type: Number, required: true },
    matchedTags: [{ type: String }],
}, { _id: false });

const recommendationSchema = mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, unique: true },
    generatedAt: { type: Date, default: Date.now },
    algorithmVersion: { type: String, default: 'v1-weighted-tag' },
    topDestinations: [topDestinationSchema],
}, { timestamps: true });

module.exports = mongoose.model('Recommendation', recommendationSchema);
