const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { validationResult } = require('express-validator');
const { protect } = require('../middlewares/authMiddleware');
const {
    createParty,
    joinParty,
    getMyParties,
    getPartyDetails,
    kickMember,
    leaveParty,
    transferLeadership,
    updatePartyStatus,
    regenerateInviteCode,
    getPartyMembers,
} = require('../controllers/partyController');

// ─── INLINE VALIDATION MIDDLEWARE ────────────────────────────────────────────
/**
 * Reusable middleware that reads express-validator results and responds with
 * 422 if there are errors. Keeps route definitions clean.
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            success: false,
            errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
        });
    }
    return next();
};

// ─── VALIDATION RULE SETS ─────────────────────────────────────────────────────

const createPartyRules = [
    body('name')
        .trim()
        .notEmpty().withMessage('Party name is required')
        .isLength({ min: 2, max: 80 }).withMessage('Name must be 2–80 characters'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 300 }).withMessage('Description cannot exceed 300 characters'),

    body('destination')
        .optional()
        .trim()
        .isLength({ max: 150 }).withMessage('Destination cannot exceed 150 characters'),

    body('maxMembers')
        .optional()
        .isInt({ min: 2, max: 100 }).withMessage('maxMembers must be between 2 and 100'),
];

const joinPartyRules = [
    body('inviteCode')
        .trim()
        .notEmpty().withMessage('Invite code is required')
        .isLength({ min: 8, max: 8 }).withMessage('Invite code must be exactly 8 characters'),
];

const transferLeadershipRules = [
    body('newLeaderId')
        .notEmpty().withMessage('newLeaderId is required')
        .isMongoId().withMessage('newLeaderId must be a valid MongoDB ID'),
];

const updateStatusRules = [
    body('status')
        .notEmpty().withMessage('status is required')
        .isIn(['open', 'active', 'closed']).withMessage('status must be open, active, or closed'),
];

const mongoIdParam = (name) =>
    param(name).isMongoId().withMessage(`${name} must be a valid MongoDB ID`);

// ─── ROUTES ───────────────────────────────────────────────────────────────────
// All routes are protected — a valid Bearer token is required.

// ── Collection Routes ─────────────────────────────────────────────────────────

// GET    /api/parties         →  List all parties I'm in
router.get('/', protect, getMyParties);

// POST   /api/parties         →  Create a new party
router.post('/', protect, createPartyRules, validate, createParty);

// POST   /api/parties/join    →  Join via invite code
router.post('/join', protect, joinPartyRules, validate, joinParty);

// ── Single Party Routes ───────────────────────────────────────────────────────

// GET    /api/parties/:partyId                          →  Party details
router.get('/:partyId', protect, [mongoIdParam('partyId')], validate, getPartyDetails);

// GET    /api/parties/:partyId/members                  →  Party members list
router.get('/:partyId/members', protect, [mongoIdParam('partyId')], validate, getPartyMembers);

// POST   /api/parties/:partyId/leave                    →  Leave the party
router.post('/:partyId/leave', protect, [mongoIdParam('partyId')], validate, leaveParty);

// ── Leader-Only Routes ────────────────────────────────────────────────────────

// PATCH  /api/parties/:partyId/status                   →  Update party status
router.patch('/:partyId/status', protect, [mongoIdParam('partyId'), ...updateStatusRules], validate, updatePartyStatus);

// PATCH  /api/parties/:partyId/transfer-leadership      →  Hand off leadership
router.patch('/:partyId/transfer-leadership', protect, [mongoIdParam('partyId'), ...transferLeadershipRules], validate, transferLeadership);

// PATCH  /api/parties/:partyId/regenerate-code          →  Get a fresh invite code
router.patch('/:partyId/regenerate-code', protect, [mongoIdParam('partyId')], validate, regenerateInviteCode);

// DELETE /api/parties/:partyId/members/:memberId        →  Kick a member
router.delete('/:partyId/members/:memberId', protect, [mongoIdParam('partyId'), mongoIdParam('memberId')], validate, kickMember);

module.exports = router;
