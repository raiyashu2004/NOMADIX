const mongoose = require('mongoose');

/**
 * Returns the first `len` characters of `str` followed by '…', or '<empty>'
 * if the string is blank. Used to give a safe, redacted preview in logs.
 */
const redact = (str, len = 12) => {
    if (!str || str.trim() === '') return '<empty>';
    return str.slice(0, len) + '…';
};

/**
 * Return an actionable hint for common Mongoose / MongoDB connection errors.
 */
const hint = (error) => {
    const msg = (error.message || '').toLowerCase();
    const name = (error.name || '').toLowerCase();

    if (name === 'mongoparseerror' || msg.includes('invalid scheme')) {
        return 'Hint: MONGO_URI must start with "mongodb://" or "mongodb+srv://".';
    }
    if (msg.includes('authentication failed') || msg.includes('bad auth') || msg.includes('unauthorized')) {
        return 'Hint: Check the username and password in your MONGO_URI.';
    }
    if (msg.includes('ip') || msg.includes('allowlist') || msg.includes('whitelist') || name === 'mongoserverselectionerror') {
        return 'Hint: Make sure your server\'s IP address is allowed in MongoDB Atlas Network Access (or use 0.0.0.0/0 for testing).';
    }
    if (msg.includes('timed out') || msg.includes('timeout')) {
        return 'Hint: Connection timed out — check network access and that the MongoDB host is reachable.';
    }
    return null;
};

const connectDB = async () => {
    const uri = process.env.MONGO_URI;

    // ── Validate MONGO_URI before attempting to connect ──────────────────────
    if (!uri || uri.trim() === '') {
        console.error([
            '❌  MongoDB connection failed: MONGO_URI is not set.',
            '    Please set the MONGO_URI environment variable to your MongoDB connection string.',
            '    Example (Atlas):',
            '      MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbName>?retryWrites=true&w=majority',
            '    Example (self-hosted):',
            '      MONGO_URI=mongodb://localhost:27017/<dbName>',
        ].join('\n'));
        process.exit(1);
    }

    if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
        console.error([
            `❌  MongoDB connection failed: MONGO_URI has an invalid scheme.`,
            `    Value preview : ${redact(uri)}`,
            `    Expected      : connection string must start with "mongodb://" or "mongodb+srv://"`,
            `    Example       : mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbName>`,
        ].join('\n'));
        process.exit(1);
    }

    // ── Attempt connection ────────────────────────────────────────────────────
    try {
        const conn = await mongoose.connect(uri);
        console.log(`✅  MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        const actionableHint = hint(error);
        console.error([
            `❌  MongoDB connection error [${error.name}]: ${error.message}`,
            `    URI preview: ${redact(uri)}`,
            actionableHint,
        ].filter(Boolean).join('\n'));
        process.exit(1);
    }
};

module.exports = connectDB;
