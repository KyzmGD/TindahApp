# API Reference

The local API origin is `http://localhost:5000`. JSON application routes are
mounted beneath `/api`; Swagger UI is available at `/api-docs`.

## Authentication and conventions

Protected endpoints require a JWT:

```http
Authorization: Bearer <JWT>
Content-Type: application/json
```

Errors use an appropriate HTTP status and a JSON `message`. Validation failures
can also include `errors` keyed by field. Unless noted otherwise, IDs are MongoDB
ObjectId strings.

Versioned auth, swipe, upload, and user routes are preferred. Equivalent legacy
mounts without `/v1` remain available for compatibility.

## Endpoint summary

| Domain | Method | Endpoint | Description |
| --- | --- | --- | --- |
| Health | `GET` | `/health` | HTTP process health (outside `/api`) |
| Auth | `POST` | `/api/v1/auth/register` | Register and return a JWT |
| Auth | `POST` | `/api/v1/auth/login` | Log in and return a JWT |
| Auth | `GET` | `/api/v1/auth/me` | Get the authenticated profile |
| Auth | `PATCH` | `/api/v1/auth/me` | Update basic authenticated-user fields |
| Profile | `PUT` | `/api/v1/users/profile` | Update profile, preferences, location, and gaming profiles |
| Profile | `GET` | `/api/v1/users/explore` | Discover nearby compatible profiles |
| Push | `POST` | `/api/v1/users/push-token` | Register or refresh a push token |
| Push | `DELETE` | `/api/v1/users/push-token` | Revoke a push token |
| Swipe | `GET` | `/api/v1/swipes/discover` | Get swipe candidates |
| Swipe | `POST` | `/api/v1/swipes` | Create or update a swipe |
| Match | `GET` | `/api/matches` | List active direct and team matches |
| Match | `PATCH` | `/api/matches/:matchId/unmatch` | End an active match |
| Chat | `GET` | `/api/chats/:matchId/messages` | Get the newest messages |
| Chat | `POST` | `/api/chats/:matchId/messages` | Persist and broadcast a message |
| Chat | `GET` | `/api/v1/messages/:matchId` | Get paginated message history |
| Upload | `POST` | `/api/v1/upload/image` | Upload a profile image |
| Upload | `POST` | `/api/v1/upload/save-avatar` | Assign an uploaded image as the avatar |
| Upload | `POST` | `/api/v1/upload/save-profile-photo` | Add an uploaded image to profile photos |
| Lobby | `GET` | `/api/v1/gamer-lobby/stats` | Get live gamer and open-party totals |
| Lobby | `GET` | `/api/v1/gamer-lobby/explore` | Find compatible gamers and parties |
| Lobby | `GET` | `/api/v1/gamer-lobby/recruitments` | List open recruitment posts |
| Lobby | `POST` | `/api/v1/gamer-lobby/recruitments` | Create a recruitment and team chat |
| Lobby | `POST` | `/api/v1/gamer-lobby/recruitments/:recruitmentId/join` | Join a party |
| Lobby | `POST` | `/api/v1/gamer-lobby/recruitments/:recruitmentId/leave` | Leave a party |
| Lobby | `PATCH` | `/api/v1/gamer-lobby/recruitments/:recruitmentId/close` | Close an owned party |

## Authentication

Register with `name`, `email`, `password`, `birthDate`, and `gender`:

```json
{
  "name": "Player One",
  "email": "player@example.com",
  "password": "StrongPass123",
  "birthDate": "1998-04-12",
  "gender": "nonbinary"
}
```

`gender` is one of `woman`, `man`, `nonbinary`, or `other`. A successful register
returns HTTP 201 with `{ "token": "...", "user": { ... } }`. Login accepts only
`email` and `password`. `GET /me` restores a session from its JWT.

## Profile and discovery

`PUT /api/v1/users/profile` accepts profile fields such as `name`, `bio`,
`birthDate`, `gender`, `interestedIn`, `interests`, `jobTitle`, `school`,
`languages`, `profileDetails`, `gamingProfiles`, location, age range, distance, and
advanced filters. The endpoint validates the complete update before saving it.

`GET /api/v1/users/explore` requires numeric `lat` and `lng`; `radiusKm` defaults
to 50. MongoDB coordinates use `[longitude, latitude]` order.

```http
GET /api/v1/users/explore?lat=10.7769&lng=106.7009&radiusKm=25
```

`GET /api/v1/swipes/discover?limit=20` uses the stored profile location and
preferences, excludes prior swipes, and returns `{ "users": [...] }`.

## Swipes and matches

Create a swipe using the preferred compatibility payload:

```json
{
  "targetId": "USER_ID",
  "type": "like"
}
```

`type` accepts `like`, `pass`, or `superlike`; `pass` is normalized to the stored
`nope` direction. The native `{ "targetUserId": "...", "direction": "nope" }`
shape is also accepted. A successful request returns HTTP 201 and includes boolean
`isMatch`; a reciprocal like also returns the created match and emits `match:new`.

`GET /api/matches` returns `{ "matches": [...] }`. Each active match can represent
a direct dating conversation or a gamer-lobby team. Only participants can unmatch
or access its messages.

## Chat

The versioned history route accepts `page` and `limit` and returns messages plus
pagination metadata. The unversioned chat history route returns the newest page as
`{ "messages": [...] }`.

REST message creation accepts:

```json
{
  "text": "Ready to queue?",
  "imageUrl": "https://example.com/image.webp",
  "clientMessageId": "device-generated-unique-id"
}
```

At least one supported content field must be present. `clientMessageId` makes
retries idempotent for a sender. A saved message returns HTTP 201, updates unread
state, and is emitted to the match room.

## Uploads

Upload multipart form data with an `image` field. JPG, PNG, and WEBP are accepted,
with a maximum size of 5 MB:

```bash
curl -X POST http://localhost:5000/api/v1/upload/image \
  -H "Authorization: Bearer <JWT>" \
  -F "image=@avatar.webp"
```

The response includes `url` and `publicId`. Pass those values to `save-avatar` or
`save-profile-photo`. A profile can contain at most six photos.

## Push tokens

Register a token with `token`, optional `provider` (`expo` or `web`), `platform`
(`ios`, `android`, `web`, or `unknown`), and optional `deviceId`. Revoke by sending
the identifying `token`, `deviceId`, and/or provider fields to the DELETE endpoint.

## Gamer lobby

Lobby discovery and recruitment listing require `game` and `lobbyGroup` query
parameters; `limit` defaults to 20 and is capped at 50.

Recruitment creation accepts fields including:

```json
{
  "gameName": "Valorant",
  "currentRank": "Gold",
  "teamSize": 4,
  "playMode": "ranked",
  "teamName": "Night Queue",
  "lobbyCode": "ABC123",
  "note": "Mic preferred"
}
```

Team size must be 2 or 4 and play mode must be `ranked` or `casual`. Supported
games and ranks are validated by the server. Lobby codes are required for selected
games and use game-specific formats. Creating or joining a recruitment provisions
or synchronizes its team chat.

## Socket.IO

Connect to the backend origin without `/api` and authenticate in the handshake:

```js
const socket = io("http://localhost:5000", {
  auth: { token: "<JWT>" },
});
```

| Event | Direction | Description |
| --- | --- | --- |
| `presence:subscribe` | Client -> server | Subscribe to authorized match presence |
| `presence:snapshot` | Server -> client | Current presence for match participants |
| `presence:update` | Server -> client | A participant's presence changed |
| `match:join` | Client -> server | Validate membership and join a match room |
| `send_message` | Client -> server | Persist a message and acknowledge it |
| `receive_message` | Server -> client | Deliver a persisted message |
| `message:notification` | Server -> client | Refresh conversation/unread state |
| `typing` | Bidirectional | Publish typing state inside a match |
| `read_message` | Bidirectional | Persist and broadcast a read receipt |
| `match:new` | Server -> client | Notify both users of a reciprocal match |
| `matches:updated` | Server -> client | Refresh direct/team match lists |
| `team:membership` | Server -> client | Team chat membership changed |
| `gamer_lobby:team_found` | Server -> client | A member joined an owner's party |
| `gamer_lobby:team_dissolved` | Server -> client | Recruitment chat access was dissolved |
| `gamer_lobby:recruitment_updated` | Server -> client | Recruitment state changed |
| `live_lobby:stats` | Server -> client | Updated gamer and open-party totals |

Events that mutate state accept an acknowledgement callback. Authorization is
checked for every match-scoped subscription or action.
