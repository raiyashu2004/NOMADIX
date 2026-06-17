const mongoose = require('mongoose');

const destinationSchema = mongoose.Schema({
    name: { type: String, required: true },
    country: { type: String, required: true },
    region: { type: String, default: '' },
    tags: {
        budget: { type: String, enum: ['budget', 'moderate', 'luxury'], required: true },
        vibe: { type: String, enum: ['adventure', 'relaxation', 'cultural', 'party', 'nature', 'city'], required: true },
        pace: { type: String, enum: ['slow', 'moderate', 'fast'], required: true },
    },
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Destination', destinationSchema);
