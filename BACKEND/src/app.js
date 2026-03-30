const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const billRoutes = require('./routes/billRoutes');
const partyRoutes = require('./routes/partyRoutes');

const app = express();

// ─── GLOBAL MIDDLEWARES ───────────────────────────────────────────────────────

// CORS — allow credentials so cookies are sent cross-origin in development
app.use(cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
    credentials: true,  // Required for HTTP-Only cookie to be sent
}));

// Parse incoming JSON bodies
app.use(express.json());

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Parse cookies — required to read the refreshToken HTTP-Only cookie
app.use(cookieParser());

// HTTP request logger (only in development)
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// ─── HEALTH CHECK ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
    });
});

// ─── API ROUTES ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/parties', partyRoutes);

// ─── ERROR HANDLING ───────────────────────────────────────────────────────────
// 404 for unmatched routes
app.use(notFound);
// Central error formatter
app.use(errorHandler);

module.exports = app;
