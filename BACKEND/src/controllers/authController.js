const { validationResult } = require('express-validator');
const crypto = require('crypto');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');

// ─── HELPERS ────────────────────────────────────────────────────────────────

/**
 * Attach a refresh token as an HTTP-Only secure cookie.
 * HTTP-Only → JS cannot read it (XSS protection).
 * Secure   → Only sent over HTTPS.
 * SameSite → CSRF protection.
 */
const attachRefreshCookie = (res, rawRefreshToken) => {
    res.cookie('refreshToken', rawRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
    });
};

/**
 * Strip the refresh cookie from the response.
 */
const clearRefreshCookie = (res) => {
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });
};

// ─── CONTROLLERS ─────────────────────────────────────────────────────────────

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 *
 * Body: { name, email, password }
 * Returns: { user, accessToken }
 * Sets:    refreshToken cookie
 */
const registerUser = async (req, res) => {
    // 1. Check express-validator errors (defined per-route)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            success: false,
            errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
        });
    }

    const { name, email, password } = req.body;

    try {
        // 2. Prevent duplicate accounts (case-insensitive because schema lowercases)
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists',
            });
        }

        // 3. Create user (password is hashed in the pre-save hook)
        const user = await User.create({ name, email, password });

        // 4. Generate access token + refresh token
        const accessToken = generateAccessToken(user._id, user.role);
        const { raw: rawRefresh, hashed: hashedRefresh } = generateRefreshToken();

        // 5. Persist hashed refresh token in DB
        user.refreshToken = hashedRefresh;
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        // 6. Set HTTP-Only cookie and respond
        attachRefreshCookie(res, rawRefresh);

        return res.status(201).json({
            success: true,
            message: 'Account created successfully',
            data: {
                user: user.toPublicJSON(),
                accessToken,
            },
        });
    } catch (error) {
        // Mongoose validation errors (schema-level)
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ success: false, errors: messages });
        }
        console.error('[registerUser]', error);
        return res.status(500).json({ success: false, message: 'Server error during registration' });
    }
};

/**
 * @desc    Login an existing user
 * @route   POST /api/auth/login
 * @access  Public
 *
 * Body: { email, password }
 * Returns: { user, accessToken }
 * Sets:    refreshToken cookie
 */
const loginUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            success: false,
            errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
        });
    }

    const { email, password } = req.body;

    try {
        // Explicitly select password back since it is excluded by default (select: false)
        const user = await User.findOne({ email }).select('+password +refreshToken');

        // Use a single generic error to prevent user enumeration attacks
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been disabled. Please contact support.',
            });
        }

        const accessToken = generateAccessToken(user._id, user.role);
        const { raw: rawRefresh, hashed: hashedRefresh } = generateRefreshToken();

        user.refreshToken = hashedRefresh;
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        attachRefreshCookie(res, rawRefresh);

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: user.toPublicJSON(),
                accessToken,
            },
        });
    } catch (error) {
        console.error('[loginUser]', error);
        return res.status(500).json({ success: false, message: 'Server error during login' });
    }
};

/**
 * @desc    Refresh the access token using the stored HTTP-Only cookie
 * @route   POST /api/auth/refresh-token
 * @access  Public (cookie required)
 *
 * Returns: { accessToken }
 * Rotates: refreshToken cookie (one-time use → new token issued each call)
 */
const refreshAccessToken = async (req, res) => {
    const rawToken = req.cookies?.refreshToken;

    if (!rawToken) {
        return res.status(401).json({ success: false, message: 'No refresh token provided' });
    }

    try {
        // Hash the raw token and look it up in the DB
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        const user = await User.findOne({ refreshToken: hashedToken }).select('+refreshToken');

        if (!user) {
            return res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
        }

        // Rotate: issue new pair (prevents replay attacks)
        const newAccessToken = generateAccessToken(user._id, user.role);
        const { raw: newRawRefresh, hashed: newHashedRefresh } = generateRefreshToken();

        user.refreshToken = newHashedRefresh;
        await user.save({ validateBeforeSave: false });

        attachRefreshCookie(res, newRawRefresh);

        return res.status(200).json({
            success: true,
            data: { accessToken: newAccessToken },
        });
    } catch (error) {
        console.error('[refreshAccessToken]', error);
        return res.status(500).json({ success: false, message: 'Server error during token refresh' });
    }
};

/**
 * @desc    Logout user — invalidate refresh token in DB and clear cookie
 * @route   POST /api/auth/logout
 * @access  Private (requires valid access token)
 */
const logoutUser = async (req, res) => {
    try {
        // req.user is populated by the protect middleware
        await User.findByIdAndUpdate(
            req.user._id,
            { $unset: { refreshToken: '' } },
            { new: true }
        );

        clearRefreshCookie(res);

        return res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('[logoutUser]', error);
        return res.status(500).json({ success: false, message: 'Server error during logout' });
    }
};

/**
 * @desc    Get currently authenticated user's profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.status(200).json({ success: true, data: { user: user.toPublicJSON() } });
    } catch (error) {
        console.error('[getMe]', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { registerUser, loginUser, refreshAccessToken, logoutUser, getMe };
