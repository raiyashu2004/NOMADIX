/**
 * Connected Users Store
 * ──────────────────────
 * In-memory Map that tracks which socket IDs belong to which users
 * and which party rooms they are currently in.
 *
 * Structure:
 *   socketId → { userId, name, email, rooms: Set<partyId> }
 *
 * Trade-off:
 *   This is a single-process in-memory store.
 *   For multi-server (clustered) deployments, replace with a
 *   Redis adapter (socket.io-redis) which shares state across instances.
 */
class ConnectedUsers {
    constructor() {
        this._store = new Map(); // socketId → user info
    }

    /**
     * Register a socket when a user connects.
     * @param {string} socketId
     * @param {{ _id, name, email }} user
     */
    add(socketId, user) {
        this._store.set(socketId, {
            userId: user._id,
            name: user.name,
            email: user.email,
            rooms: new Set(),
            connectedAt: new Date(),
        });
    }

    /**
     * Remove a socket when it disconnects.
     * @param {string} socketId
     */
    remove(socketId) {
        this._store.delete(socketId);
    }

    /**
     * Record that a socket has joined a party room.
     * @param {string} socketId
     * @param {string} partyId
     */
    joinRoom(socketId, partyId) {
        const entry = this._store.get(socketId);
        if (entry) entry.rooms.add(partyId);
    }

    /**
     * Record that a socket has left a party room.
     * @param {string} socketId
     * @param {string} partyId
     */
    leaveRoom(socketId, partyId) {
        const entry = this._store.get(socketId);
        if (entry) entry.rooms.delete(partyId);
    }

    /**
     * Get data for a single socket.
     * @param {string} socketId
     * @returns {object|undefined}
     */
    get(socketId) {
        return this._store.get(socketId);
    }

    /**
     * Count of all connected sockets.
     * @returns {number}
     */
    get totalConnected() {
        return this._store.size;
    }

    /**
     * Get all sockets currently in a particular room.
     * @param {string} partyId
     * @returns {Array}
     */
    getByRoom(partyId) {
        const result = [];
        for (const [socketId, data] of this._store) {
            if (data.rooms.has(partyId)) {
                result.push({ socketId, ...data, rooms: [...data.rooms] });
            }
        }
        return result;
    }
}

// Export a singleton — shared across all socket handlers in this process
module.exports = new ConnectedUsers();
