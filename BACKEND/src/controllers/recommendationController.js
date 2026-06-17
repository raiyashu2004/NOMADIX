const Group = require('../models/Group');
const SurveyResponse = require('../models/SurveyResponse');
const Destination = require('../models/Destination');
const Recommendation = require('../models/Recommendation');
const { generateRecommendations: runConsensus } = require('../utils/consensus');

/**
 * POST /api/groups/:groupId/recommendations/generate
 * Leader-only: run the consensus algorithm and persist recommendations.
 */
const generateRecommendations = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        if (!group.leader.equals(userId)) {
            return res.status(403).json({ success: false, message: 'Only the group leader can generate recommendations' });
        }

        const surveyResponses = await SurveyResponse.find({ groupId });
        if (!surveyResponses.length) {
            return res.status(400).json({ success: false, message: 'No survey responses found — members must complete the survey first' });
        }

        const destinations = await Destination.find({});
        const { topDestinations } = runConsensus(surveyResponses, destinations);

        // Map to storable format (destination ObjectId + score + matchedTags)
        const topDestinationDocs = topDestinations.map(({ destination, score, matchedTags }) => ({
            destination: destination._id,
            score,
            matchedTags,
        }));

        const recommendation = await Recommendation.findOneAndUpdate(
            { groupId },
            { groupId, generatedAt: new Date(), topDestinations: topDestinationDocs },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Populate destination details for the response
        await recommendation.populate('topDestinations.destination');

        group.currentPhase = 'recommendations';
        await group.save();

        const io = req.app.get('io');
        if (io) {
            io.to(groupId).emit('recommendations_generated', {
                groupId,
                generatedAt: recommendation.generatedAt,
                topDestinations: recommendation.topDestinations,
            });
        }

        res.status(200).json({ success: true, data: recommendation });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/groups/:groupId/recommendations
 * Any group member can view the generated recommendations.
 */
const getRecommendations = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        if (!group.members.some(m => m.equals(userId))) {
            return res.status(403).json({ success: false, message: 'Access denied — you are not a member of this group' });
        }

        const recommendation = await Recommendation.findOne({ groupId })
            .populate('topDestinations.destination');

        if (!recommendation) {
            return res.status(404).json({ success: false, message: 'Recommendations have not been generated yet' });
        }

        res.status(200).json({ success: true, data: recommendation });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { generateRecommendations, getRecommendations };
