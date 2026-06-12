# Tinder Clone Backend

Express + MongoDB API for auth, discovery, swipes, matches, chat messages and Socket.IO realtime events.

## Setup

```bash
cd back-end
cp .env.example .env
npm install
npm run dev
```

Required services:

- MongoDB at `MONGO_URI`
- Redis is optional. Leave `REDIS_URL` empty if you do not need it yet.

## Main Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/auth/me`
- `GET /api/swipes/discover`
- `POST /api/swipes`
- `GET /api/matches`
- `PATCH /api/matches/:matchId/unmatch`
- `GET /api/chats/:matchId/messages`
- `POST /api/chats/:matchId/messages`
