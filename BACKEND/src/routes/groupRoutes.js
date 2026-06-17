const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
    createGroup,
    joinGroup,
    getMyGroups,
    getGroupDetails,
    startJourney,
    updateLocation,
    removeMember,
} = require('../controllers/groupController');

// ─── GROUP ROUTES ─────────────────────────────────────────────────────────────
//  All routes require a valid Bearer access token

// GET    /api/groups              →  List all groups the user belongs to
router.get('/', protect, getMyGroups);

// POST   /api/groups              →  Create a new group
router.post('/', protect, createGroup);

// POST   /api/groups/join         →  Join via invite code
router.post('/join', protect, joinGroup);

// GET    /api/groups/:id          →  Get single group details (members only)
router.get('/:id', protect, getGroupDetails);

// PATCH  /api/groups/:id/start-journey   →  Leader starts the journey
router.patch('/:id/start-journey', protect, startJourney);

// PATCH  /api/groups/:id/location        →  Leader updates live location
router.patch('/:id/location', protect, updateLocation);

// DELETE /api/groups/:id/members/:memberId  →  Leader removes a member
router.delete('/:id/members/:memberId', protect, removeMember);

module.exports = router;
