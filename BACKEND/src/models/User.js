const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12; // Higher than default 10 → stronger hashes in production

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [50, 'Name cannot exceed 50 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [8, 'Password must be at least 8 characters'],
            // Never return password in any query by default
            select: false,
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },
        // Stored hashed refresh token for refresh-token rotation
        refreshToken: {
            type: String,
            select: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastLogin: {
            type: Date,
        },
    },
    {
        timestamps: true, // createdAt + updatedAt auto-managed
    }
);

// ─── PRE-SAVE HOOK ───────────────────────────────────────────────────────────
// Hash password only when it is newly set or modified
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next(); // <-- must return to skip hashing

    try {
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        this.password = await bcrypt.hash(this.password, salt);
        return next();
    } catch (error) {
        return next(error);
    }
});

// ─── INSTANCE METHODS ────────────────────────────────────────────────────────

/**
 * Compare a plain-text password against the stored hash.
 * Used during login only (password field is excluded by default).
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
    return bcrypt.compare(enteredPassword, this.password);
};

/**
 * Return a sanitised user object safe to send to clients.
 * Strips sensitive fields before sending over the wire.
 */
userSchema.methods.toPublicJSON = function () {
    return {
        _id: this._id,
        name: this.name,
        email: this.email,
        role: this.role,
        isActive: this.isActive,
        lastLogin: this.lastLogin,
        createdAt: this.createdAt,
    };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
