const Party = require('../models/Party');
const Group = require('../models/Group');
const connectedUsers = require('./connectedUsers');

/**
 * Journey & Party Socket Handler
 * ────────────────────────────────
 * Central hub for all real-time events in the app.
 *
 * All handlers receive an authenticated socket (socket.user is set
 * by the socketAuth middleware BEFORE this fires).
 *
 * Room convention: every party/group uses its MongoDB _id as the room name.
 * Clients join a room once, then receive all broadcasts for that party.
 *
 * Event Map
 * ─────────────────────────────────────────────────────────────────
 * Client → Server (emit)         Server → Client (broadcast)
 * ─────────────────────────────────────────────────────────────────
 * join_party_room          →     party_room_joined  (ack)
 * leave_party_room         →     party_room_left    (ack)
 * start_journey            →     journey_started    (room broadcast)
 * update_location          →     location_updated   (room broadcast)
 * send_party_message       →     party_message      (room broadcast)
 * ping                     →     pong               (ack)
 * ─────────────────────────────────────────────────────────────────
 */
const setupJourneySocket = (io) => {

    // ─── PER-CONNECTION HANDLER ───────────────────────────────────────────────
    io.on('connection', (socket) => {
        const { _id: userId, name, email } = socket.user;

        // Register in the in-memory store
        connectedUsers.add(socket.id, socket.user);

        console.log(`🟢 [Socket] Connected  | user: ${name} (${userId}) | socket: ${socket.id} | total: ${connectedUsers.totalConnected}`);

        // Send a welcome acknowledgement with basic server info
        socket.emit('connected', {
            message: `Welcome, ${name}!`,
            socketId: socket.id,
            serverTime: new Date().toISOString(),
        });

        // ── join_party_room ───────────────────────────────────────────────────
        /**
         * Client calls this once to subscribe to live updates for a party.
         * Validates membership before admitting the socket to the room.
         *
         * emit:  join_party_room  →  { partyId }
         * ack:   party_room_joined → { partyId, memberCount }
         * err:   error            → { message }
         */
        socket.on('join_party_room', async ({ partyId } = {}, callback) => {
            const ack = typeof callback === 'function' ? callback : () => {};
            try {
                if (!partyId) {
                    return ack({ success: false, message: 'partyId is required' });
                }

                // Verify the user is an actual party member (DB guard)
                const party = await Party.findById(partyId).select('name members status');
                if (!party) {
                    return ack({ success: false, message: 'Party not found' });
                }

                const isMember = party.members.some((m) => m.user.equals(userId));
                if (!isMember) {
                    return ack({ success: false, message: 'Access denied — you are not a member of this party' });
                }

                // Join the Socket.io room
                await socket.join(partyId);
                connectedUsers.joinRoom(socket.id, partyId);

                // Notify the room that a member came online
                socket.to(partyId).emit('member_online', {
                    userId,
                    name,
                    partyId,
                    timestamp: new Date().toISOString(),
                });

                const roomSize = io.sockets.adapter.rooms.get(partyId)?.size || 1;

                console.log(`📥 [Socket] ${name} joined room: ${partyId} | room size: ${roomSize}`);

                ack({
                    success: true,
                    partyId,
                    partyName: party.name,
                    status: party.status,
                    onlineCount: roomSize,
                });

            } catch (err) {
                console.error(`[join_party_room] ${err.message}`);
                ack({ success: false, message: 'Server error joining room' });
            }
        });

        // ── join_group_room (alias for join_party_room for consensus feature) ──
        /**
         * Alias so the consensus feature can join rooms using groupId.
         * Validates Group membership instead of Party membership.
         *
         * emit:  join_group_room  →  { groupId }
         * ack:   group_room_joined → { groupId, memberCount }
         */
        socket.on('join_group_room', async ({ groupId } = {}, callback) => {
            const ack = typeof callback === 'function' ? callback : () => {};
            try {
                if (!groupId) {
                    return ack({ success: false, message: 'groupId is required' });
                }

                const group = await Group.findById(groupId).select('name members currentPhase');
                if (!group) {
                    return ack({ success: false, message: 'Group not found' });
                }

                const isMember = group.members.some((m) => m.equals(userId));
                if (!isMember) {
                    return ack({ success: false, message: 'Access denied — you are not a member of this group' });
                }

                await socket.join(groupId);
                connectedUsers.joinRoom(socket.id, groupId);

                socket.to(groupId).emit('member_online', {
                    userId,
                    name,
                    groupId,
                    timestamp: new Date().toISOString(),
                });

                const roomSize = io.sockets.adapter.rooms.get(groupId)?.size || 1;
                console.log(`📥 [Socket] ${name} joined group room: ${groupId} | room size: ${roomSize}`);

                ack({
                    success: true,
                    groupId,
                    groupName: group.name,
                    currentPhase: group.currentPhase,
                    onlineCount: roomSize,
                });
            } catch (err) {
                console.error(`[join_group_room] ${err.message}`);
                ack({ success: false, message: 'Server error joining group room' });
            }
        });

        // ── leave_group_room (alias for leave_party_room for consensus feature) ─
        socket.on('leave_group_room', async ({ groupId } = {}, callback) => {
            const ack = typeof callback === 'function' ? callback : () => {};
            try {
                if (!groupId) {
                    return ack({ success: false, message: 'groupId is required' });
                }

                socket.leave(groupId);
                connectedUsers.leaveRoom(socket.id, groupId);

                socket.to(groupId).emit('member_offline', {
                    userId,
                    name,
                    groupId,
                    timestamp: new Date().toISOString(),
                });

                console.log(`📤 [Socket] ${name} left group room: ${groupId}`);
                ack({ success: true, groupId });
            } catch (err) {
                console.error(`[leave_group_room] ${err.message}`);
                ack({ success: false, message: 'Server error leaving group room' });
            }
        });

        // ── leave_party_room ──────────────────────────────────────────────────
        /**
         * Explicitly unsubscribes from a party room (without disconnecting).
         *
         * emit:  leave_party_room  →  { partyId }
         * ack:   party_room_left   →  { partyId }
         */
        socket.on('leave_party_room', async ({ partyId } = {}, callback) => {
            const ack = typeof callback === 'function' ? callback : () => {};
            try {
                if (!partyId) {
                    return ack({ success: false, message: 'partyId is required' });
                }

                socket.leave(partyId);
                connectedUsers.leaveRoom(socket.id, partyId);

                // Notify remaining members
                socket.to(partyId).emit('member_offline', {
                    userId,
                    name,
                    partyId,
                    timestamp: new Date().toISOString(),
                });

                console.log(`📤 [Socket] ${name} left room: ${partyId}`);
                ack({ success: true, partyId });

            } catch (err) {
                console.error(`[leave_party_room] ${err.message}`);
                ack({ success: false, message: 'Server error leaving room' });
            }
        });

        // ── start_journey ─────────────────────────────────────────────────────
        /**
         * Leader emits this to start the journey for all party members.
         * Validates leader role and party status in DB before persisting.
         *
         * emit:  start_journey  →  { partyId, currentLocation? }
         * ack:   (callback)     →  { success, message }
         * broadcast (room):  journey_started  →  { partyId, partyName, startedBy, currentLocation, startedAt }
         */
        socket.on('start_journey', async ({ partyId, currentLocation } = {}, callback) => {
            const ack = typeof callback === 'function' ? callback : () => {};
            try {
                if (!partyId) {
                    return ack({ success: false, message: 'partyId is required' });
                }

                const party = await Party.findById(partyId);
                if (!party) {
                    return ack({ success: false, message: 'Party not found' });
                }

                // Only the leader can start the journey
                if (!party.leader.equals(userId)) {
                    return ack({ success: false, message: 'Only the party leader can start the journey' });
                }

                if (party.status !== 'open') {
                    return ack({
                        success: false,
                        message: `Journey cannot be started — party is "${party.status}"`,
                    });
                }

                // Persist the state change
                party.status = 'active';
                party.journeyStartedAt = new Date();
                party.currentLocation = currentLocation?.trim() || 'Starting Point';
                await party.save();

                const payload = {
                    partyId: party._id,
                    partyName: party.name,
                    startedBy: { userId, name },
                    currentLocation: party.currentLocation,
                    startedAt: party.journeyStartedAt.toISOString(),
                };

                // Broadcast to ALL sockets in the room (including the leader)
                io.to(partyId).emit('journey_started', payload);

                console.log(`🚀 [Socket] Journey started in room: ${partyId} by ${name}`);
                ack({ success: true, message: 'Journey started! All members notified.', data: payload });

            } catch (err) {
                console.error(`[start_journey] ${err.message}`);
                ack({ success: false, message: 'Server error starting journey' });
            }
        });

        // ── update_location ───────────────────────────────────────────────────
        /**
         * Leader pushes live location updates to all members in real time.
         * Does NOT validate every push against DB (too costly for frequent updates).
         * Validates leader role once via the socket.user ID.
         *
         * emit:  update_location → { partyId, newLocation }
         * broadcast (room): location_updated → { partyId, newLocation, updatedBy, updatedAt }
         */
        socket.on('update_location', async ({ partyId, newLocation } = {}, callback) => {
            const ack = typeof callback === 'function' ? callback : () => {};
            try {
                if (!partyId || !newLocation) {
                    return ack({ success: false, message: 'partyId and newLocation are required' });
                }

                // Lightweight DB check: leader + journey must be active
                const party = await Party.findById(partyId).select('leader status');
                if (!party) {
                    return ack({ success: false, message: 'Party not found' });
                }

                if (!party.leader.equals(userId)) {
                    return ack({ success: false, message: 'Only the leader can update the location' });
                }

                if (party.status !== 'active') {
                    return ack({ success: false, message: 'Journey must be active to update location' });
                }

                // Persist latest location (async, don't await on hot path)
                Party.findByIdAndUpdate(partyId, { currentLocation: newLocation.trim() }).exec();

                const payload = {
                    partyId,
                    newLocation: newLocation.trim(),
                    updatedBy: { userId, name },
                    updatedAt: new Date().toISOString(),
                };

                // Emit to everyone in the room
                io.to(partyId).emit('location_updated', payload);

                ack({ success: true });

            } catch (err) {
                console.error(`[update_location] ${err.message}`);
                ack({ success: false, message: 'Server error updating location' });
            }
        });

        // ── send_party_message ────────────────────────────────────────────────
        /**
         * Simple in-party text broadcast — useful for quick trip coordination.
         * Messages are NOT persisted (stateless chat).
         *
         * emit:  send_party_message → { partyId, message }
         * broadcast (room): party_message → { partyId, from, message, sentAt }
         */
        socket.on('send_party_message', async ({ partyId, message } = {}, callback) => {
            const ack = typeof callback === 'function' ? callback : () => {};
            try {
                if (!partyId || !message?.trim()) {
                    return ack({ success: false, message: 'partyId and message are required' });
                }

                if (message.trim().length > 500) {
                    return ack({ success: false, message: 'Message cannot exceed 500 characters' });
                }

                // Verify membership before broadcasting
                const party = await Party.findById(partyId).select('members');
                if (!party || !party.members.some((m) => m.user.equals(userId))) {
                    return ack({ success: false, message: 'Access denied' });
                }

                const payload = {
                    partyId,
                    from: { userId, name },
                    message: message.trim(),
                    sentAt: new Date().toISOString(),
                };

                io.to(partyId).emit('party_message', payload);
                ack({ success: true });

            } catch (err) {
                console.error(`[send_party_message] ${err.message}`);
                ack({ success: false, message: 'Server error sending message' });
            }
        });

        // ── ping / pong ───────────────────────────────────────────────────────
        /**
         * Simple heartbeat so clients can measure round-trip latency.
         *
         * emit:  ping → { timestamp }
         * ack:   pong → { timestamp, serverTime, latencyMs }
         */
        socket.on('ping', ({ timestamp } = {}, callback) => {
            const ack = typeof callback === 'function' ? callback : () => {};
            const serverTime = Date.now();
            ack({
                serverTime: new Date(serverTime).toISOString(),
                latencyMs: timestamp ? serverTime - timestamp : null,
            });
        });

        // ── disconnect ────────────────────────────────────────────────────────
        /**
         * Fires when the TCP connection drops (browser close, network loss, etc.)
         * Cleans up the store and notifies all rooms this socket was in.
         */
        socket.on('disconnect', (reason) => {
            const userData = connectedUsers.get(socket.id);

            if (userData) {
                // Notify every room the user was in
                for (const partyId of userData.rooms) {
                    socket.to(partyId).emit('member_offline', {
                        userId,
                        name,
                        partyId,
                        reason,
                        timestamp: new Date().toISOString(),
                    });
                }
            }

            connectedUsers.remove(socket.id);

            console.log(`🔴 [Socket] Disconnected | user: ${name} (${userId}) | reason: ${reason} | total: ${connectedUsers.totalConnected}`);
        });

        // ── error ─────────────────────────────────────────────────────────────
        /**
         * Catches any unhandled errors thrown inside event handlers.
         */
        socket.on('error', (err) => {
            console.error(`[Socket error] user: ${name} | ${err.message}`);
        });
    });
};

module.exports = setupJourneySocket;
