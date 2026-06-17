const mongoose = require('mongoose');

const surveyResponseSchema = mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    budget: { type: String, enum: ['budget', 'moderate', 'luxury'], required: true },
    vibe: { type: String, enum: ['adventure', 'relaxation', 'cultural', 'party', 'nature', 'city'], required: true },
    pace: { type: String, enum: ['slow', 'moderate', 'fast'], required: true },
}, { timestamps: true });

// One response per user per group
surveyResponseSchema.index({ groupId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('SurveyResponse', surveyResponseSchema);
