const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { getItinerary, addItineraryItem, deleteItineraryItem } = require('../controllers/itineraryController');

// GET    /api/itinerary/group/:groupId     -> Get group itinerary
router.get('/group/:groupId', protect, getItinerary);

// POST   /api/itinerary/group/:groupId     -> Add item to group itinerary
router.post('/group/:groupId', protect, addItineraryItem);

// DELETE /api/itinerary/:itemId            -> Delete an itinerary item
router.delete('/:itemId', protect, deleteItineraryItem);

module.exports = router;
