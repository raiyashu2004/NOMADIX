# 🌍 Travel Group App — Backend

Production-ready REST API + WebSocket backend for a collaborative travel group application.

**Stack:** Node.js · Express · MongoDB (Mongoose) · Socket.io · JWT · bcryptjs

---

## 📁 Project Structure

```
BACKEND/
├── .env                          # Environment variables (never commit this)
├── .gitignore
├── package.json
└── src/
    ├── server.js                 # Entry point: HTTP server + Socket.io
    ├── app.js                    # Express config: CORS, middlewares, routes
    ├── config/
    │   └── db.js                 # MongoDB connection via Mongoose
    ├── models/
    │   ├── User.js               # User schema (bcrypt hooks, role, refresh token)
    │   ├── Group.js              # Group schema (leader, members, invite code)
    │   └── Bill.js               # Bill schema (amount, paidBy, splitAmong)
    ├── controllers/
    │   ├── authController.js     # register, login, refresh, logout, getMe
    │   ├── groupController.js    # createGroup, joinGroup, getGroupDetails
    │   └── billController.js     # addBill, getGroupBills
    ├── routes/
    │   ├── authRoutes.js         # /api/auth/* (rate-limited + validated)
    │   ├── groupRoutes.js        # /api/groups/*
    │   └── billRoutes.js         # /api/bills/*
    ├── middlewares/
    │   ├── authMiddleware.js     # protect() + authorize() RBAC
    │   └── errorMiddleware.js    # notFound + errorHandler
    ├── utils/
    │   └── generateToken.js      # generateAccessToken() + generateRefreshToken()
    └── sockets/
        └── journeySocket.js      # Real-time journey sync via Socket.io
```

---

## ⚙️ Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Rename or edit `.env`:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/travel-group-app
JWT_SECRET=replace_with_a_strong_32+_char_secret
JWT_ACCESS_EXPIRES=15m
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:3000
```

> **MongoDB Atlas:** Replace `MONGO_URI` with your Atlas connection string.

### 3. Start dev server
```bash
npm run dev
```
Or production:
```bash
npm start
```

---

## 🔐 Auth API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | Public | Create account |
| `POST` | `/api/auth/login` | Public | Login → access token + cookie |
| `POST` | `/api/auth/refresh-token` | Cookie | Rotate access token |
| `POST` | `/api/auth/logout` | Bearer | Invalidate session |
| `GET`  | `/api/auth/me` | Bearer | Get own profile |

### Register — `POST /api/auth/register`
```json
{
  "name": "Riya Sharma",
  "email": "riya@example.com",
  "password": "Secure@123"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "_id": "...", "name": "Riya Sharma", "email": "riya@example.com", "role": "user" },
    "accessToken": "<JWT>"
  }
}
```

### Login — `POST /api/auth/login`
```json
{ "email": "riya@example.com", "password": "Secure@123" }
```
> Access token returned in JSON. Refresh token set as **HTTP-Only** cookie automatically.

---

## 👥 Groups API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/groups` | Bearer | Create a group |
| `POST` | `/api/groups/join` | Bearer | Join via invite code |
| `GET`  | `/api/groups/:id` | Bearer | Get group details |

### Create Group — `POST /api/groups`
```json
{ "name": "Goa Trip 2025" }
```
**Response includes** a unique `inviteCode` (e.g. `"A3F2CD"`) to share with friends.

### Join Group — `POST /api/groups/join`
```json
{ "inviteCode": "A3F2CD" }
```

---

## 💰 Bills API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/bills` | Bearer | Add a bill to a group |
| `GET`  | `/api/bills/group/:groupId` | Bearer | Get all group bills |

### Add Bill — `POST /api/bills`
```json
{
  "groupId": "<group_id>",
  "description": "Hotel booking",
  "totalAmount": 4500,
  "splitAmong": ["<userId1>", "<userId2>"]
}
```

---

## ⚡ Real-time (Socket.io)

Connect to `http://localhost:5000` via any Socket.io client.

| Event (emit) | Payload | Description |
|--------------|---------|-------------|
| `join_group_room` | `groupId` | Subscribe to a group's live updates |
| `start_journey` | `{ groupId, leaderId }` | Leader starts the journey |
| `update_location` | `{ groupId, leaderId, newLocation }` | Leader updates location |

| Event (listen) | Payload | Description |
|----------------|---------|-------------|
| `journey_started` | `{ groupId, message, currentLocation }` | Fired to all room members |
| `location_updated` | `{ groupId, newLocation }` | Fired on location change |

---

## 🛡️ Security

| Feature | Implementation |
|---------|----------------|
| Password hashing | bcryptjs, 12 salt rounds |
| Access tokens | JWT, 15-minute expiry |
| Refresh tokens | Opaque 64-byte hex, SHA-256 hashed in DB |
| Cookie security | HTTP-Only, Secure (prod), SameSite=Strict |
| Token rotation | New refresh token on every `/refresh-token` call |
| Rate limiting | 10 req/15 min on login + register |
| Input validation | express-validator on all auth routes |
| RBAC | `protect` + `authorize('admin')` middleware chain |

---

## 🧪 Test with Postman

Set base URL to `http://localhost:5000`.

1. Register → copy `accessToken`
2. Add header: `Authorization: Bearer <accessToken>`
3. Create group → note `inviteCode`
4. Login as a second user → join group with invite code
5. Connect via Socket.io → emit `start_journey`
