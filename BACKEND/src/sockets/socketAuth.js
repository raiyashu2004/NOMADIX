const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Socket.io Authentication Middleware
 * ─────────────────────────────────────
 * Runs once per connection BEFORE the socket is accepted.
 * Reads the JWT from the handshake (auth.token or query.token),
 * verifies it, fetches the user, and attaches to socket.user.
 *
 * Usage in server setup:
 *   io.use(socketAuth);
 *
 * Client must send token on connect:
 *   const socket = io('http://localhost:5000', {
 *     auth: { token: 'Bearer <accessToken>' }
 *   });
 */
const socketAuth = async (socket, next) => {
    try {
        // Support both formats: 'Bearer <token>' or raw token
        const raw =
            socket.handshake.auth?.token ||       // preferred: auth object
            socket.handshake.headers?.authorization || // fallback: header
            socket.handshake.query?.token;        // last resort: query string

        if (!raw) {
            return next(new Error('AUTH_MISSING: No token provided'));
        }

        const token = raw.startsWith('Bearer ') ? raw.split(' ')[1] : raw;

        // Verify signature and expiry
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user (ensures deactivated users are rejected)
        const user = await User.findById(decoded.id).select('name email role isActive');

        if (!user) {
            return next(new Error('AUTH_INVALID: User not found'));
        }

        if (!user.isActive) {
            return next(new Error('AUTH_FORBIDDEN: Account is disabled'));
        }

        // Attach user to socket — available in all event handlers
        socket.user = {
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
        };

        return next(); // Accept connection
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return next(new Error('AUTH_EXPIRED: Access token has expired'));
        }
        if (error.name === 'JsonWebTokenError') {
            return next(new Error('AUTH_INVALID: Invalid token'));
        }
        console.error('[socketAuth]', error.message);
        return next(new Error('AUTH_ERROR: Authentication failed'));
    }
};

module.exports = socketAuth;
