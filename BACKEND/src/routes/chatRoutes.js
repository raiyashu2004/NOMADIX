const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { getMessages, sendMessage } = require('../controllers/chatController');

router.get('/group/:groupId', protect, getMessages);
router.post('/group/:groupId', protect, sendMessage);

module.exports = router;
