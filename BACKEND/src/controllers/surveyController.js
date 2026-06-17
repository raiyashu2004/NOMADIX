const Group = require('../models/Group');
const SurveyResponse = require('../models/SurveyResponse');

const VALID_BUDGET = ['budget', 'moderate', 'luxury'];
const VALID_VIBE = ['adventure', 'relaxation', 'cultural', 'party', 'nature', 'city'];
const VALID_PACE = ['slow', 'moderate', 'fast'];

/**
 * POST /api/groups/:groupId/survey
 * Submit or update the authenticated user's survey response for a group.
 */
const submitSurvey = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;
        const { budget, vibe, pace } = req.body;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        if (!group.members.some(m => m.equals(userId))) {
            return res.status(403).json({ success: false, message: 'Access denied — you are not a member of this group' });
        }

        if (!VALID_BUDGET.includes(budget)) {
            return res.status(400).json({ success: false, message: `budget must be one of: ${VALID_BUDGET.join(', ')}` });
        }
        if (!VALID_VIBE.includes(vibe)) {
            return res.status(400).json({ success: false, message: `vibe must be one of: ${VALID_VIBE.join(', ')}` });
        }
        if (!VALID_PACE.includes(pace)) {
            return res.status(400).json({ success: false, message: `pace must be one of: ${VALID_PACE.join(', ')}` });
        }

        const surveyResponse = await SurveyResponse.findOneAndUpdate(
            { groupId, userId },
            { groupId, userId, budget, vibe, pace },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Advance phase to 'survey' if still in planning
        if (group.currentPhase === 'planning') {
            group.currentPhase = 'survey';
            await group.save();
        }

        const io = req.app.get('io');
        if (io) {
            io.to(groupId).emit('survey_submitted', {
                groupId,
                userId,
                userName: req.user.name,
                submittedAt: surveyResponse.updatedAt,
            });
        }

        res.status(200).json({ success: true, data: surveyResponse });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/groups/:groupId/survey
 * Get survey completion status for the group.
 */
const getSurveyStatus = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        const group = await Group.findById(groupId).populate('members', 'name email');
        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        if (!group.members.some(m => m._id.equals(userId))) {
            return res.status(403).json({ success: false, message: 'Access denied — you are not a member of this group' });
        }

        const responses = await SurveyResponse.find({ groupId }).populate('userId', 'name email');

        const respondentIds = new Set(responses.map(r => r.userId._id.toString()));

        const respondents = responses.map(r => ({
            userId: r.userId._id,
            name: r.userId.name,
            email: r.userId.email,
            submittedAt: r.updatedAt,
        }));

        const pendingMembers = group.members
            .filter(m => !respondentIds.has(m._id.toString()))
            .map(m => ({ userId: m._id, name: m.name, email: m.email }));

        res.status(200).json({
            success: true,
            data: {
                groupId,
                totalMembers: group.members.length,
                respondents,
                pendingMembers,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { submitSurvey, getSurveyStatus };
