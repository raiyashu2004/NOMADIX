const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :groupId
const { protect } = require('../middlewares/authMiddleware');
const { submitSurvey, getSurveyStatus } = require('../controllers/surveyController');
const { generateRecommendations, getRecommendations } = require('../controllers/recommendationController');
const { castVote, getVotes } = require('../controllers/voteController');

router.use(protect);

router.route('/survey').post(submitSurvey).get(getSurveyStatus);
router.route('/recommendations/generate').post(generateRecommendations);
router.route('/recommendations').get(getRecommendations);
router.route('/votes').post(castVote).get(getVotes);

module.exports = router;
