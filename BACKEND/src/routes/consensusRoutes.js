const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router({ mergeParams: true }); // mergeParams to access :groupId
const { protect } = require('../middlewares/authMiddleware');
const { submitSurvey, getSurveyStatus } = require('../controllers/surveyController');
const { generateRecommendations, getRecommendations } = require('../controllers/recommendationController');
const { castVote, getVotes } = require('../controllers/voteController');

const consensusLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 60,
    message: {
        success: false,
        message: 'Too many requests from this IP. Please try again after 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

router.use(protect);
router.use(consensusLimiter);

router.route('/survey').post(submitSurvey).get(getSurveyStatus);
router.route('/recommendations/generate').post(generateRecommendations);
router.route('/recommendations').get(getRecommendations);
router.route('/votes').post(castVote).get(getVotes);

module.exports = router;
