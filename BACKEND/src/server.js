const http = require('http');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const socketAuth = require('./sockets/socketAuth');
const setupJourneySocket = require('./sockets/journeySocket');

// ── Load environment variables first ─────────────────────────────────────────
dotenv.config();

// ── Connect to MongoDB ────────────────────────────────────────────────────────
connectDB();

const PORT = process.env.PORT || 5000;

// ── Create HTTP server from Express app ───────────────────────────────────────
const server = http.createServer(app);

// ── Initialise Socket.io ──────────────────────────────────────────────────────
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
    },
    // Ping clients every 25s; disconnect if no response within 60s
    pingInterval: 25000,
    pingTimeout: 60000,
    // Prefer WebSocket; fall back to polling only if needed
    transports: ['websocket', 'polling'],
});

// ── Socket.io Authentication Middleware ───────────────────────────────────────
/**
 * socketAuth runs for every incoming connection BEFORE the 'connection' event.
 * It verifies the JWT and attaches socket.user — rejecting anonymous sockets.
 */
io.use(socketAuth);

/**
 * Handle auth errors on the client side:
 *   socket.on('connect_error', (err) => console.error(err.message));
 *
 * Error messages are prefixed (AUTH_MISSING, AUTH_EXPIRED, etc.)
 * so the client can decide the appropriate recovery action.
 */

// ── Make io available to Express controllers ──────────────────────────────────
/**
 * REST controllers (e.g. partyController.js) can now fire socket events
 * by calling:  req.app.get('io').to(roomId).emit(event, payload)
 */
app.set('io', io);

// ── Register all socket event handlers ───────────────────────────────────────
setupJourneySocket(io);

// ── Start listening ───────────────────────────────────────────────────────────
server.listen(PORT, () => {
    console.log(`\n🚀  Server    : http://localhost:${PORT}`);
    console.log(`⚡  WebSocket  : ws://localhost:${PORT}`);
    console.log(`🌍  Mode      : ${process.env.NODE_ENV}\n`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
/**
 * On SIGTERM / SIGINT:
 *  1. Close the HTTP server (stop accepting new connections)
 *  2. Disconnect all sockets cleanly
 *  3. Exit the process
 */
const shutdown = (signal) => {
    console.log(`\n[${signal}] Shutting down gracefully...`);

    // Notify all connected clients before closing
    io.emit('server_shutdown', {
        message: 'Server is restarting. Please reconnect in a moment.',
        timestamp: new Date().toISOString(),
    });

    // Give clients 1s to receive the event, then close
    setTimeout(() => {
        io.close(() => console.log('✅  Socket.io closed'));
        server.close(() => {
            console.log('✅  HTTP server closed');
            process.exit(0);
        });
    }, 1000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Catch unhandled promise rejections at the process level
process.on('unhandledRejection', (reason) => {
    console.error('⛔  Unhandled Rejection:', reason);
    shutdown('UNHANDLED_REJECTION');
});
