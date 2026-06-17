const Group = require('../models/Group');
const Recommendation = require('../models/Recommendation');
const Vote = require('../models/Vote');

/**
 * POST /api/groups/:groupId/votes
 * Cast or update a vote for one of the recommended destinations.
 */
const castVote = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;
        const { destinationId } = req.body;

        if (!destinationId) {
            return res.status(400).json({ success: false, message: 'destinationId is required' });
        }

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        if (!group.members.some(m => m.equals(userId))) {
            return res.status(403).json({ success: false, message: 'Access denied — you are not a member of this group' });
        }

        // Verify the destination is one of the top 3 recommended
        const recommendation = await Recommendation.findOne({ groupId });
        if (!recommendation) {
            return res.status(400).json({ success: false, message: 'Recommendations have not been generated yet' });
        }

        const isValidChoice = recommendation.topDestinations.some(
            td => td.destination.equals(destinationId)
        );
        if (!isValidChoice) {
            return res.status(400).json({ success: false, message: 'You can only vote for one of the recommended destinations' });
        }

        const vote = await Vote.findOneAndUpdate(
            { groupId, userId },
            { groupId, userId, destinationId },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Advance phase to 'voting' if not already in a later phase
        if (group.currentPhase === 'recommendations') {
            group.currentPhase = 'voting';
            await group.save();
        }

        // Compute updated vote counts to broadcast (O(n+m) via pre-built map)
        const allVotes = await Vote.find({ groupId });
        const countMap = {};
        for (const v of allVotes) {
            const key = v.destinationId.toString();
            countMap[key] = (countMap[key] || 0) + 1;
        }
        const voteCounts = recommendation.topDestinations.map(td => ({
            destinationId: td.destination,
            count: countMap[td.destination.toString()] || 0,
        }));

        const io = req.app.get('io');
        if (io) {
            io.to(groupId).emit('vote_cast', {
                groupId,
                votedBy: { userId, name: req.user.name },
                destinationId,
                voteCounts,
            });
        }

        res.status(200).json({ success: true, data: vote });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/groups/:groupId/votes
 * Get current vote tallies and the authenticated user's own vote.
 */
const getVotes = async (req, res) => {
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

        const allVotes = await Vote.find({ groupId });

        // Aggregate vote counts per destination
        const countMap = {};
        for (const v of allVotes) {
            const key = v.destinationId.toString();
            countMap[key] = (countMap[key] || 0) + 1;
        }
        const voteCounts = Object.entries(countMap).map(([destId, count]) => ({
            destinationId: destId,
            count,
        }));

        const myVoteDoc = allVotes.find(v => v.userId.equals(userId));
        const myVote = myVoteDoc ? myVoteDoc.destinationId : null;

        res.status(200).json({ success: true, data: { voteCounts, myVote } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { castVote, getVotes };
