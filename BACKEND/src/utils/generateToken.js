const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Generate a short-lived JWT Access Token.
 * Payload: { id, role }
 * Expiry:  15 minutes (configurable via JWT_ACCESS_EXPIRES env var)
 *
 * @param {string} id   - MongoDB user _id
 * @param {string} role - User role (e.g. 'user' | 'admin')
 * @returns {string} Signed JWT access token
 */
const generateAccessToken = (id, role) => {
    return jwt.sign(
        { id, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
    );
};

/**
 * Generate a long-lived opaque Refresh Token.
 * It is a random 64-byte hex string so it cannot be decoded/guessed.
 * Store the hash of this in the database; send the raw value to the client.
 *
 * @returns {{ raw: string, hashed: string }}
 */
const generateRefreshToken = () => {
    const raw = crypto.randomBytes(64).toString('hex'); // 128-char hex string
    const hashed = crypto.createHash('sha256').update(raw).digest('hex');
    return { raw, hashed };
};

module.exports = { generateAccessToken, generateRefreshToken };
