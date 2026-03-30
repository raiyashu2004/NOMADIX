const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ─── PROTECT MIDDLEWARE ──────────────────────────────────────────────────────
/**
 * @desc  Verify JWT access token on every protected route.
 *        Extracts Bearer token from Authorization header,
 *        verifies it, fetches the user, and attaches to req.user.
 *
 * Usage: router.get('/protected', protect, handler)
 */
const protect = async (req, res, next) => {
    let token;

    // 1. Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. No token provided.',
        });
    }

    try {
        // 2. Verify signature and expiry
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3. Fetch fresh user from DB (ensures deactivated/deleted users are rejected)
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User belonging to this token no longer exists.',
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been disabled.',
            });
        }

        // 4. Attach user to request — available in all downstream handlers
        req.user = user;
        return next();
    } catch (error) {
        // Distinguish between expired and malformed tokens
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Access token has expired. Please refresh your token.',
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. Please log in again.',
            });
        }
        console.error('[protect middleware]', error);
        return res.status(500).json({ success: false, message: 'Server error during authentication' });
    }
};

// ─── ROLE GUARD MIDDLEWARE ───────────────────────────────────────────────────
/**
 * @desc  Role-Based Access Control (RBAC) gate.
 *        Must be chained AFTER protect, which sets req.user.
 *
 *        Usage: router.delete('/:id', protect, authorize('admin'), handler)
 *
 * @param {...string} roles - Allowed roles, e.g. authorize('admin', 'moderator')
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Role '${req.user.role}' is not authorized to access this route.`,
            });
        }
        return next();
    };
};

module.exports = { protect, authorize };
