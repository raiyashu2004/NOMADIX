const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    getMe,
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// ─── RATE LIMITERS ───────────────────────────────────────────────────────────
/**
 * Strict limiter for auth routes.
 * Prevents brute-force attacks on login/register.
 * 10 requests per 15 minutes per IP.
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 10,
    message: {
        success: false,
        message: 'Too many requests from this IP. Please try again after 15 minutes.',
    },
    standardHeaders: true,  // Return rate limit info in RateLimit-* headers
    legacyHeaders: false,
});

// ─── VALIDATION RULES ────────────────────────────────────────────────────────

const registerValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number')
        .matches(/[@$!%*?&#]/).withMessage('Password must contain at least one special character (@$!%*?&#)'),
];

const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required'),
];

// ─── ROUTES ──────────────────────────────────────────────────────────────────

// POST /api/auth/register  →  Create a new account
router.post('/register', authLimiter, registerValidation, registerUser);

// POST /api/auth/login  →  Login and receive access + refresh tokens
router.post('/login', authLimiter, loginValidation, loginUser);

// POST /api/auth/refresh-token  →  Issue new access token using HTTP-only cookie
router.post('/refresh-token', refreshAccessToken);

// POST /api/auth/logout  →  Invalidate refresh token (protected)
router.post('/logout', protect, logoutUser);

// GET  /api/auth/me  →  Get own profile (protected)
router.get('/me', protect, getMe);

module.exports = router;
