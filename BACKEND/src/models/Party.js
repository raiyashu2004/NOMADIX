const mongoose = require('mongoose');
const crypto = require('crypto');

// ─── MEMBER SUB-DOCUMENT ─────────────────────────────────────────────────────
/**
 * Each party member is stored as an embedded sub-document.
 * This lets us track their role and when they joined
 * without needing a separate collection.
 */
const memberSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        role: {
            type: String,
            enum: ['leader', 'member'],
            default: 'member',
        },
        joinedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false } // No separate _id for sub-docs; user ref is the identity
);

// ─── PARTY SCHEMA ─────────────────────────────────────────────────────────────
const partySchema = new mongoose.Schema(
    {
        // ── Basic Info ────────────────────────────────────────────────────────
        name: {
            type: String,
            required: [true, 'Party name is required'],
            trim: true,
            minlength: [2, 'Party name must be at least 2 characters'],
            maxlength: [80, 'Party name cannot exceed 80 characters'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [300, 'Description cannot exceed 300 characters'],
            default: '',
        },

        // ── Leader Reference ──────────────────────────────────────────────────
        /**
         * Stored separately (denormalised) for fast leader lookups
         * without scanning the members array.
         * Must always stay in sync with the members sub-document.
         */
        leader: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Party must have a leader'],
        },

        // ── Members List ──────────────────────────────────────────────────────
        members: {
            type: [memberSchema],
            default: [],
        },

        // ── Invite Code ───────────────────────────────────────────────────────
        /**
         * 8-character uppercase hex code.
         * Unique across all parties. Used as the join key.
         * Example: "A3F2CD91"
         */
        inviteCode: {
            type: String,
            unique: true,
            uppercase: true,
            index: true,          // Indexed for fast JOIN lookups
        },

        // ── Capacity ──────────────────────────────────────────────────────────
        maxMembers: {
            type: Number,
            default: 20,
            min: [2, 'Party must allow at least 2 members'],
            max: [100, 'Party cannot exceed 100 members'],
        },

        // ── Lifecycle Status ──────────────────────────────────────────────────
        /**
         * open     → accepting new members (default)
         * active   → journey started; members locked, no new joins
         * closed   → party ended / archived
         */
        status: {
            type: String,
            enum: {
                values: ['open', 'active', 'closed'],
                message: 'Status must be open, active, or closed',
            },
            default: 'open',
        },

        // ── Destination Info ──────────────────────────────────────────────────
        destination: {
            type: String,
            trim: true,
            maxlength: [150, 'Destination cannot exceed 150 characters'],
            default: '',
        },

        journeyStartedAt: {
            type: Date,
        },

        currentLocation: {
            type: String,
            trim: true,
            default: '',
        },
    },
    {
        timestamps: true,
        // Add a virtual `memberCount` so callers don't need to measure the array
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─── VIRTUALS ─────────────────────────────────────────────────────────────────
partySchema.virtual('memberCount').get(function () {
    return this.members.length;
});

partySchema.virtual('isFull').get(function () {
    return this.members.length >= this.maxMembers;
});

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
/**
 * Auto-generate a unique invite code before first save.
 */
partySchema.pre('save', async function (next) {
    if (!this.isNew) return next(); // Only run on creation

    try {
        let code;
        let exists = true;

        // Keep generating until we get a unique code (collision-safe)
        while (exists) {
            code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8-char hex
            exists = await mongoose.model('Party').exists({ inviteCode: code });
        }

        this.inviteCode = code;
        return next();
    } catch (err) {
        return next(err);
    }
});

// ─── INSTANCE METHODS ─────────────────────────────────────────────────────────

/**
 * Check if a given userId is already a member of this party.
 * @param {string|ObjectId} userId
 * @returns {boolean}
 */
partySchema.methods.hasMember = function (userId) {
    return this.members.some((m) => m.user.equals(userId));
};

/**
 * Check if a given userId is the leader.
 * @param {string|ObjectId} userId
 * @returns {boolean}
 */
partySchema.methods.isLeader = function (userId) {
    return this.leader.equals(userId);
};

// ─── INDEXES ──────────────────────────────────────────────────────────────────
partySchema.index({ leader: 1 });
partySchema.index({ 'members.user': 1 });
partySchema.index({ status: 1 });

const Party = mongoose.model('Party', partySchema);

module.exports = Party;
