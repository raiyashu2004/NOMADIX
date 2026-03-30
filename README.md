# NOMADIX

> An all-in-one travel app that eliminates friction in group trips — consensus building, logistics, and expense splitting.

## Features (MVP — Consensus First)

- **Builds Consensus**: Survey members on Budget, Vibe & Pace → generate top 3 destination recommendations → democratic vote with live progress.
- **Groups**: Create a group, share the invite code, members join and collaborate.
- **Real-time**: Socket.io keeps every member in sync — survey submissions, new recommendations, and vote counts update live.

---

## Quick Start

### Prerequisites

- Node.js ≥ 18
- MongoDB (local or Atlas)

---

### 1 — Backend

```bash
cd BACKEND
cp .env.example .env       # fill in MONGO_URI and JWT_SECRET
npm install
npm run dev                # starts on http://localhost:5000
```

**Seed destination data** (run once after first start):

```bash
npm run seed
```

This populates 30 pre-tagged destinations used by the recommendation engine.

---

### 2 — Frontend

```bash
cd frontend
npm install
npm run dev                # starts on http://localhost:3000
```

The Vite dev server proxies `/api/*` requests to `http://localhost:5000` automatically.

---

## Environment Variables (Backend)

See `BACKEND/.env.example` for all variables. Required ones:

| Variable | Description |
|---|---|
| `PORT` | HTTP port (default: `5000`) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs (32+ chars) |
| `JWT_ACCESS_EXPIRES` | Access token lifetime (default: `15m`) |
| `CLIENT_ORIGIN` | Frontend origin for CORS (default: `http://localhost:3000`) |

---

## Consensus Flow

1. **Create / join a group** — Dashboard creates a group (auto-generates invite code) or joins via code.
2. **Survey** — Each member submits Budget / Vibe / Pace preferences.
3. **Generate Recommendations** — Group leader clicks "Generate Top 3" once members have responded. The algorithm computes a group preference profile (mode per field) and scores all 30 destinations by tag match.
4. **Vote** — Members vote for one of the 3 recommendations. Live progress bars update via Socket.io.

---

## API Overview

All endpoints (except `/api/auth/register` and `/api/auth/login`) require `Authorization: Bearer <token>`.

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |
| POST | `/api/groups` | Create group |
| POST | `/api/groups/join` | Join via invite code |
| GET | `/api/groups` | My groups |
| GET | `/api/groups/:id` | Group details |
| POST | `/api/groups/:groupId/survey` | Submit survey |
| GET | `/api/groups/:groupId/survey` | Survey completion status |
| POST | `/api/groups/:groupId/recommendations/generate` | Generate recommendations (leader) |
| GET | `/api/groups/:groupId/recommendations` | Get top 3 |
| POST | `/api/groups/:groupId/votes` | Cast / update vote |
| GET | `/api/groups/:groupId/votes` | Vote counts + my vote |

---

## Real-time Socket Events

Connect with `auth: { token: <jwt> }` and emit `join_group_room` with `{ groupId }`.

| Event | Direction | Description |
|---|---|---|
| `join_group_room` | Client → Server | Subscribe to group room |
| `survey_submitted` | Server → Client | A member submitted their survey |
| `recommendations_generated` | Server → Client | Recommendations are ready |
| `vote_cast` | Server → Client | A vote was cast; includes updated counts |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Zustand, Axios, Socket.io-client |
| Backend | Node.js, Express, MongoDB, Mongoose, Socket.io, JWT |
| Algorithm | Deterministic weighted tag matching (open-source, no external API) |

---

## Project Structure

```
NOMADIX/
├── BACKEND/              # Node.js + Express API
│   ├── src/
│   │   ├── controllers/  # Business logic
│   │   ├── models/       # Mongoose schemas
│   │   ├── routes/       # Express routers
│   │   ├── sockets/      # Socket.io handlers
│   │   ├── utils/        # consensus algorithm, token utils
│   │   ├── data/         # destinations.json seed data
│   │   └── scripts/      # seedDestinations.js
│   └── .env.example
├── frontend/             # React + TypeScript + Vite
│   └── src/
│       ├── api/          # Axios API wrappers
│       ├── pages/        # Dashboard, Consensus, Party, Login, Register
│       ├── store/        # Zustand stores (auth, party, consensus)
│       └── socket.ts     # Socket.io client singleton
└── bill-scanner/         # FastAPI OCR service (not in MVP scope)
```
