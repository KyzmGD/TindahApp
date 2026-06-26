# Tinder Clone Backend

Express + MongoDB API for auth, discovery, swipes, matches, chat messages and Socket.IO realtime events.

## Architecture

- `src/app.js` owns Express middleware, health checks, API routing and error responses.
- `src/server.js` connects MongoDB, optional Redis, HTTP and Socket.IO.
- `src/models` contains Mongoose schemas for users, swipes, matches and messages.
- `src/controllers` keeps request/response handling thin.
- `src/services` owns matching, discovery, geospatial filtering and chat persistence.
- `src/sockets/chat.socket.js` authenticates Socket.IO clients with the same JWT used by REST.

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

## Swipe And Match Rules

- Users can swipe `like`, `nope` or `superlike` on another user.
- Discovery excludes the current user and anyone already swiped by that user.
- Discovery respects `interestedIn`, reciprocal gender interest, age range and optional distance preferences.
- A match is created when both users have a positive swipe (`like` or `superlike`).
- Matches use a deterministic `participantsKey` so the same pair cannot create duplicate match records.

## Socket.IO Events

Client authentication:

```js
io(SOCKET_URL, {
  auth: { token },
  transports: ["websocket"],
});
```

- `match:join` with `matchId`: validates membership and joins the chat room.
- `typing` with `{ matchId, isTyping }`: broadcasts typing state to the match room.
- `message:new`: emitted to the match room when a REST message is created.
- `match:new`: emitted to both users when a reciprocal swipe creates or reactivates a match.
