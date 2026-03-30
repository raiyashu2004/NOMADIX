const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
    addBill,
    getGroupBills,
    getSettlementSummary,
    deleteBill,
} = require('../controllers/billController');

// ─── BILL ROUTES ──────────────────────────────────────────────────────────────
//  All routes require a valid Bearer access token

// POST   /api/bills                              →  Add a new bill to a group
router.post('/', protect, addBill);

// GET    /api/bills/group/:groupId               →  All bills for a group (paginated)
router.get('/group/:groupId', protect, getGroupBills);

// GET    /api/bills/group/:groupId/summary       →  Settlement summary (who owes whom)
router.get('/group/:groupId/summary', protect, getSettlementSummary);

// DELETE /api/bills/:billId                      →  Delete a bill (creator only)
router.delete('/:billId', protect, deleteBill);

module.exports = router;
