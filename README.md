# Tindah - Tinder Clone App

Tindah is a Tinder-style mobile dating application built with React Native Expo,
Node.js, Express, MongoDB, Redis, and Socket.IO.

The app currently supports account registration, profile management, discovery,
swiping, automatic matching, chat history, real-time chat, offline message retry,
Redis-backed swipe exclusion cache, and load testing for concurrent swipes.

---

## Current Progress

| Module | Status | Notes |
| --- | --- | --- |
| Authentication | Done | Register, login, JWT auth, current user profile |
| User profile | Done | Update name, bio, birth date, interests, job, school |
| Search filters | Done | Gender preference and min/max age are saved and applied to Explore |
| Explore | Done | Filters by distance, gender preference, age range, mutual interest, and excluded swipe history |
| Swipe API | Done | `like`, `pass`, idempotent upsert, reciprocal like creates match |
| Race condition handling | Done | Unique indexes and idempotent logic prevent duplicate matches |
| Redis cache | Done | Stores excluded swipe IDs with 24h TTL, MongoDB fallback when Redis is down |
| Load testing | Done | k6 script for 100 concurrent VUs during 1 minute |
| Match list | Done | Get active matches, unmatch |
| Message history | Done | Paginated message API sorted by `createdAt: -1` |
| Real-time chat | Done | Socket.IO room per `matchId`, `send_message`, `receive_message`, typing event |
| Network resilience | Done | Frontend queues pending messages and flushes after reconnect |
| Image upload | Partially done | Cloudinary upload and save profile photo endpoint exist; Cloudinary env is required |
| Push notification FCM #40 | Deferred | Firebase Console setup, native build, token storage, and FCM backend are planned for later |

---

## Tech Stack

### Backend

| Tool | Purpose |
| --- | --- |
| Node.js | Runtime |
| Express | REST API |
| MongoDB Atlas or local MongoDB | Main database |
| Mongoose | ODM |
| JWT | Authentication |
| Redis | Swipe exclusion cache |
| Socket.IO | Realtime chat |
| Cloudinary | Image upload |
| Jest + Supertest | Integration testing |
| k6 | Load testing |

### Frontend

| Tool | Purpose |
| --- | --- |
| React Native | Mobile UI |
| Expo | Mobile development workflow |
| Axios | REST API client |
| Socket.IO Client | Realtime chat client |
| React Navigation | Screen navigation |
| AsyncStorage | Local session storage |

---

## Project Structure

```text
TinderApp/
  backend/
    src/
      app.js
      server.js
      config/
      controllers/
      middlewares/
      models/
      routes/
      services/
      sockets/
      utils/
    tests/
  frontend/
    src/
      components/
      context/
      hooks/
      navigation/
      screens/
      services/
  docs/
  load-tests/
  README.md
```

---

## Local Setup

### Requirements

- Node.js 20+
- MongoDB local or MongoDB Atlas
- Redis 7.x, optional but recommended
- Expo CLI / Expo Go for app testing
- k6, only needed for load testing

### Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Backend default URL:

```text
http://localhost:5000
```

Example `backend/.env`:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/tinderapp
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:8081
REDIS_URL=redis://localhost:6379
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

If Redis is not running, Explore still works by falling back to MongoDB.

### Frontend

```bash
cd frontend
npm install
npm start
```

If testing on a real phone, set the API URL to your computer LAN IP:

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:5000/api
```

The frontend derives Socket.IO URL from the API URL by removing `/api`.

---

## Run Tests

Backend tests:

```bash
cd backend
npm test
```

Load test:

```bash
k6 run load-tests/swipes-load-test.js
```

Detailed load testing guide:

```text
docs/LOAD_TESTING.md
```

---

## Postman Setup

Create a Postman environment with these variables:

| Variable | Initial value |
| --- | --- |
| `baseUrl` | `http://localhost:5000` |
| `token` | empty |
| `aliceToken` | empty |
| `bobToken` | empty |
| `caseyToken` | empty |
| `aliceId` | empty |
| `bobId` | empty |
| `caseyId` | empty |
| `matchId` | empty |

Default headers for JSON APIs:

```http
Content-Type: application/json
Authorization: Bearer {{token}}
```

For login/register, do not send `Authorization`.

Recommended Postman Tests script after login/register:

```js
const body = pm.response.json();

if (body.token) {
  pm.environment.set("token", body.token);
}

if (body.user?.id) {
  pm.environment.set("currentUserId", body.user.id);
}
```

---

## REST API Reference

Prefer `/api/v1/...` for newer endpoints when available. Some legacy endpoints
without `/v1` are still mounted for compatibility.

### Health

#### GET `/health`

Checks whether the API server is alive.

Response:

```json
{
  "status": "ok",
  "service": "tinder-clone-api",
  "timestamp": "2026-07-22T00:00:00.000Z"
}
```

---

## Authentication APIs

Available prefixes:

```text
/api/auth
/api/v1/auth
```

### Register

#### POST `/api/auth/register`

Body:

```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "password123",
  "birthDate": "1998-01-01",
  "gender": "woman"
}
```

Allowed gender values:

```text
woman, man, nonbinary, other
```

Expected response: `201`

```json
{
  "token": "JWT_TOKEN",
  "user": {
    "id": "USER_ID",
    "name": "Alice",
    "email": "alice@example.com"
  }
}
```

Common errors:

| Status | Meaning |
| --- | --- |
| 400 | Invalid name, email, password, birthday, or gender |
| 409 | Email is already registered |
| 503 | Database unavailable |

### Login

#### POST `/api/auth/login`

Body:

```json
{
  "email": "alice@example.com",
  "password": "password123"
}
```

Expected response: `200`

Save `token` to Postman environment.

### Get Current User

#### GET `/api/auth/me`

Headers:

```http
Authorization: Bearer {{token}}
```

Expected response:

```json
{
  "user": {
    "id": "USER_ID",
    "name": "Alice",
    "email": "alice@example.com"
  }
}
```

### Update Current User - Legacy Flexible API

#### PATCH `/api/auth/me`

This endpoint updates broader raw user fields. It is useful in Postman for
setting location test data.

Body example:

```json
{
  "location": {
    "type": "Point",
    "coordinates": [106.660172, 10.762622]
  },
  "preferences": {
    "maxDistanceKm": 50,
    "ageRange": {
      "min": 18,
      "max": 45
    }
  },
  "interestedIn": ["woman", "man"]
}
```

Important: Geo coordinates use MongoDB order:

```text
[longitude, latitude]
```

---

## User APIs

Available prefixes:

```text
/api/users
/api/v1/users
```

### Update Profile And Search Filters

#### PUT `/api/v1/users/profile`

Headers:

```http
Authorization: Bearer {{token}}
Content-Type: application/json
```

Body:

```json
{
  "name": "Alice Updated",
  "bio": "Coffee, travel, music",
  "birthDate": "1998-01-01",
  "interests": ["coffee", "travel", "music"],
  "jobTitle": "Software Engineer",
  "school": "HCM University",
  "genderPreference": ["man"],
  "minAge": 24,
  "maxAge": 35
}
```

Aliases supported:

```json
{
  "interests": "coffee, travel, music",
  "interestedIn": ["man"],
  "preferences": {
    "ageRange": {
      "min": 24,
      "max": 35
    }
  }
}
```

Expected response:

```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "USER_ID",
    "name": "Alice Updated",
    "genderPreference": ["man"],
    "minAge": 24,
    "maxAge": 35,
    "searchFilters": {
      "genderPreference": ["man"],
      "minAge": 24,
      "maxAge": 35,
      "maxDistanceKm": 50
    }
  }
}
```

Validation rules:

| Field | Rule |
| --- | --- |
| `name` | 2-80 characters |
| `bio` | max 500 characters |
| `interests` | max 20 items, each max 40 characters |
| `genderPreference` | one or more of `woman`, `man`, `nonbinary`, `other` |
| `minAge`, `maxAge` | integer from 18 to 100, `minAge <= maxAge` |

### Explore Users

#### GET `/api/v1/users/explore?lat=10.762622&lng=106.660172&radiusKm=50`

Headers:

```http
Authorization: Bearer {{token}}
```

Query params:

| Param | Required | Example | Meaning |
| --- | --- | --- | --- |
| `lat` | yes | `10.762622` | Current latitude |
| `lng` | yes | `106.660172` | Current longitude |
| `radiusKm` | no | `50` | Search radius |

Expected response:

```json
{
  "users": [
    {
      "_id": "USER_ID",
      "id": "USER_ID",
      "name": "Bob",
      "gender": "man",
      "age": 28,
      "bio": "Hello",
      "photos": [],
      "distanceMeters": 1200,
      "distanceKm": 1.2
    }
  ]
}
```

Explore applies:

- Current user's `genderPreference`
- Current user's `preferences.ageRange`
- Candidate's mutual `interestedIn`
- Distance radius
- Already-swiped excluded IDs from Redis or MongoDB fallback

Common error:

```json
{
  "message": "lat and lng query parameters are required and must be numbers"
}
```

---

## Swipe And Discovery APIs

Available prefixes:

```text
/api/swipes
/api/v1/swipes
```

### Discover Candidates

#### GET `/api/v1/swipes/discover?limit=20`

Headers:

```http
Authorization: Bearer {{token}}
```

This is an older discovery endpoint used by swipe cards. It uses stored user
location and preferences.

Expected response:

```json
{
  "users": []
}
```

### Swipe

#### POST `/api/v1/swipes`

Headers:

```http
Authorization: Bearer {{token}}
Content-Type: application/json
```

Body for like:

```json
{
  "targetId": "{{bobId}}",
  "type": "like"
}
```

Body for pass:

```json
{
  "targetId": "{{caseyId}}",
  "type": "pass"
}
```

Legacy body is also supported:

```json
{
  "targetUserId": "{{bobId}}",
  "direction": "like"
}
```

Allowed directions:

```text
like, pass, nope, superlike
```

Note: `pass` is normalized internally to `nope`.

Response when no match:

```json
{
  "swipe": {
    "swiper": "ALICE_ID",
    "target": "BOB_ID",
    "direction": "like"
  },
  "match": null,
  "isMatch": false,
  "matchedUser": null
}
```

Response when reciprocal like creates match:

```json
{
  "swipe": {
    "swiper": "BOB_ID",
    "target": "ALICE_ID",
    "direction": "like"
  },
  "match": {
    "_id": "MATCH_ID",
    "users": []
  },
  "isMatch": true,
  "matchedUser": {}
}
```

DoD notes:

- A reciprocal double like creates exactly one active match.
- Match contains exactly 2 users.
- Duplicate swipes do not create duplicate matches.
- Redis key is written as `swipe:excluded:{userId}` with TTL 24h when Redis is online.

---

## Match APIs

Available prefix:

```text
/api/matches
```

### Get Matches

#### GET `/api/matches`

Headers:

```http
Authorization: Bearer {{token}}
```

Response:

```json
{
  "matches": [
    {
      "_id": "MATCH_ID",
      "users": [],
      "status": "active",
      "lastMessage": {
        "text": "Hello",
        "sender": "USER_ID",
        "sentAt": "2026-07-22T00:00:00.000Z"
      }
    }
  ]
}
```

### Unmatch

#### PATCH `/api/matches/:matchId/unmatch`

Headers:

```http
Authorization: Bearer {{token}}
```

Response:

```json
{
  "match": {
    "_id": "MATCH_ID",
    "status": "unmatched",
    "unmatchedBy": "USER_ID"
  }
}
```

---

## Message And Chat APIs

### Paginated Message History

Available prefix:

```text
/api/v1/messages
```

#### GET `/api/v1/messages/:matchId?page=1&limit=20`

Headers:

```http
Authorization: Bearer {{token}}
```

Response is sorted by newest first:

```json
{
  "messages": [
    {
      "_id": "MESSAGE_ID",
      "match": "MATCH_ID",
      "sender": {
        "_id": "USER_ID",
        "name": "Alice",
        "photos": []
      },
      "receiver": "USER_ID",
      "text": "Hello",
      "clientMessageId": "client-123",
      "createdAt": "2026-07-22T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

### Legacy Chat Message List

Available prefix:

```text
/api/chats
```

#### GET `/api/chats/:matchId/messages?limit=50`

Returns recent messages in chronological order for the chat UI.

### Create Message By REST

#### POST `/api/chats/:matchId/messages`

Headers:

```http
Authorization: Bearer {{token}}
Content-Type: application/json
```

Body:

```json
{
  "text": "Hello from Postman",
  "clientMessageId": "postman-message-001"
}
```

Image message body:

```json
{
  "imageUrl": "https://example.com/photo.jpg",
  "clientMessageId": "postman-image-001"
}
```

Response:

```json
{
  "message": {
    "_id": "MESSAGE_ID",
    "match": "MATCH_ID",
    "sender": {
      "_id": "USER_ID",
      "name": "Alice",
      "photos": []
    },
    "receiver": "USER_ID",
    "text": "Hello from Postman",
    "clientMessageId": "postman-message-001"
  }
}
```

Notes:

- User must belong to the active match.
- `text` or `imageUrl` is required.
- `clientMessageId` makes retries idempotent.
- The REST endpoint also emits `receive_message` through Socket.IO.

---

## Upload APIs

Available prefixes:

```text
/api/upload
/api/v1/upload
```

Cloudinary environment variables are required.

### Upload Image To Cloudinary

#### POST `/api/v1/upload/image`

Headers:

```http
Authorization: Bearer {{token}}
Content-Type: multipart/form-data
```

Postman Body:

- Select `form-data`
- Key: `image`
- Type: `File`
- Value: choose an image file

Expected response:

```json
{
  "message": "Image uploaded successfully",
  "url": "https://res.cloudinary.com/..."
}
```

### Save Profile Photo

#### POST `/api/v1/upload/save-profile-photo`

Headers:

```http
Authorization: Bearer {{token}}
Content-Type: application/json
```

Body:

```json
{
  "url": "https://res.cloudinary.com/your-cloud/image/upload/abc.jpg",
  "publicId": "optional-public-id"
}
```

Expected response:

```json
{
  "message": "Profile photo saved successfully",
  "photos": [
    {
      "url": "https://res.cloudinary.com/your-cloud/image/upload/abc.jpg",
      "publicId": "optional-public-id",
      "isPrimary": true
    }
  ]
}
```

---

## Socket.IO Events

Socket.IO is not a normal REST API, so it is not tested like JSON requests in
Postman. Use the mobile app or a Socket.IO client.

Server URL:

```text
http://localhost:5000
```

Client auth:

```js
io("http://localhost:5000", {
  transports: ["websocket"],
  auth: { token: "JWT_TOKEN" }
});
```

Events:

| Event | Direction | Payload |
| --- | --- | --- |
| `match:join` | client -> server | `matchId` |
| `send_message` | client -> server | `{ matchId, text, imageUrl, clientMessageId }` |
| `receive_message` | server -> client | saved message |
| `typing` | both | `{ matchId, isTyping, userId }` |
| `match:new` | server -> client | match |

Realtime DoD:

- Only users in the same `matchId` room receive `receive_message`.
- Message is saved to MongoDB before realtime emit.
- Offline frontend messages are queued and sent after reconnect.

---

## Postman Test Scenarios

### Scenario 1 - Register Three Users

Register Alice:

```http
POST {{baseUrl}}/api/auth/register
```

```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "password123",
  "birthDate": "1998-01-01",
  "gender": "woman"
}
```

Register Bob:

```json
{
  "name": "Bob",
  "email": "bob@example.com",
  "password": "password123",
  "birthDate": "1996-01-01",
  "gender": "man"
}
```

Register Casey:

```json
{
  "name": "Casey",
  "email": "casey@example.com",
  "password": "password123",
  "birthDate": "1997-01-01",
  "gender": "other"
}
```

Save each user's `token` and `user.id`.

### Scenario 2 - Prepare Location And Preferences

Login Alice, set `token = aliceToken`, then:

```http
PATCH {{baseUrl}}/api/auth/me
```

```json
{
  "location": {
    "type": "Point",
    "coordinates": [106.660172, 10.762622]
  },
  "interestedIn": ["man"],
  "preferences": {
    "maxDistanceKm": 50,
    "ageRange": {
      "min": 24,
      "max": 35
    }
  }
}
```

Login Bob, set `token = bobToken`, then:

```json
{
  "location": {
    "type": "Point",
    "coordinates": [106.661, 10.763]
  },
  "interestedIn": ["woman"],
  "preferences": {
    "maxDistanceKm": 50,
    "ageRange": {
      "min": 18,
      "max": 40
    }
  }
}
```

### Scenario 3 - Test Explore

Use Alice token:

```http
GET {{baseUrl}}/api/v1/users/explore?lat=10.762622&lng=106.660172&radiusKm=50
```

Expected:

- Bob appears if he matches Alice's filters.
- Users Alice already swiped are excluded.
- Redis online or offline should not break the API.

### Scenario 4 - Test Pass

Use Alice token:

```http
POST {{baseUrl}}/api/v1/swipes
```

```json
{
  "targetId": "{{caseyId}}",
  "type": "pass"
}
```

Expected:

```json
{
  "isMatch": false,
  "match": null
}
```

### Scenario 5 - Test Match

Alice likes Bob:

```http
POST {{baseUrl}}/api/v1/swipes
Authorization: Bearer {{aliceToken}}
```

```json
{
  "targetId": "{{bobId}}",
  "type": "like"
}
```

Expected:

```json
{
  "isMatch": false
}
```

Bob likes Alice:

```http
POST {{baseUrl}}/api/v1/swipes
Authorization: Bearer {{bobToken}}
```

```json
{
  "targetId": "{{aliceId}}",
  "type": "like"
}
```

Expected:

```json
{
  "isMatch": true,
  "match": {
    "_id": "MATCH_ID"
  }
}
```

Save `match._id` into `matchId`.

### Scenario 6 - Test Duplicate Like Idempotency

Send Bob likes Alice again with the same or repeated body.

Expected:

- HTTP `201`
- Still only one match in MongoDB for the two users
- `isMatch: true`
- No duplicate active match

### Scenario 7 - Test Match List

```http
GET {{baseUrl}}/api/matches
Authorization: Bearer {{aliceToken}}
```

Expected:

```json
{
  "matches": [
    {
      "_id": "{{matchId}}",
      "status": "active"
    }
  ]
}
```

### Scenario 8 - Send Message By REST

```http
POST {{baseUrl}}/api/chats/{{matchId}}/messages
Authorization: Bearer {{aliceToken}}
```

```json
{
  "text": "Hello Bob from Postman",
  "clientMessageId": "postman-alice-001"
}
```

Expected:

```json
{
  "message": {
    "text": "Hello Bob from Postman",
    "clientMessageId": "postman-alice-001"
  }
}
```

### Scenario 9 - Get Paginated Message History

```http
GET {{baseUrl}}/api/v1/messages/{{matchId}}?page=1&limit=20
Authorization: Bearer {{aliceToken}}
```

Expected:

- Messages belong to `matchId`
- Newest messages first
- `pagination` object exists

### Scenario 10 - Unmatch

```http
PATCH {{baseUrl}}/api/matches/{{matchId}}/unmatch
Authorization: Bearer {{aliceToken}}
```

Expected:

```json
{
  "match": {
    "status": "unmatched"
  }
}
```

After unmatch, chat APIs for that match should return `404 Match not found`.

---

## Redis Verification

After a swipe, check Redis if Redis is online:

```bash
redis-cli
SMEMBERS swipe:excluded:<userId>
TTL swipe:excluded:<userId>
```

Expected TTL:

```text
close to 86400 seconds
```

If Redis is offline:

- Swipe API still works.
- Explore API falls back to MongoDB.
- API must not return 500 only because Redis is unavailable.

---

## Load Testing Summary

Script:

```text
load-tests/swipes-load-test.js
```

Command:

```bash
k6 run load-tests/swipes-load-test.js
```

Acceptance criteria:

| Metric | Target |
| --- | --- |
| HTTP 500 rate | `0%` |
| HTTP error rate | `0%` |
| Average swipe response time | `<= 200 ms` |

Latest recorded manual result:

```text
Average swipe response: 75.71 ms
HTTP error rate: 0.00%
HTTP 500 rate: 0.00%
HTTP 503 rate: 0.00%
VUs: 100
Duration: 1 minute
Result: PASS
```

---

## Expo Push Notifications

Issue #44 replaces Firebase Cloud Messaging with Expo Push Service for this
Expo/React Native project.

Implemented flow:

- Frontend asks for notification permission after login, signup, or restored session.
- Frontend gets an Expo push token through `expo-notifications`.
- Frontend saves the token through `POST /api/v1/users/push-token`.
- Backend stores tokens in `users.pushTokens`.
- Backend sends a push notification when a new match is created and the target user is not connected by Socket.IO.
- Backend sends a push notification when a new message is saved and the receiver is not inside the chat room.
- When the user taps a match/message notification, the app navigates back into the matching chat flow.

### Expo Project ID

The real Expo/EAS project id is stored in:

```text
frontend/app.json
```

Expected shape:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "YOUR-REAL-UUID"
      }
    }
  }
}
```

Verify it with:

```bash
cd frontend
npx expo config --type public
```

The output must show a real UUID, not `REPLACE_WITH_EAS_PROJECT_ID`.

Restart Expo after changing notification config:

```bash
npx expo start -c
```

### Save Push Token API

#### POST `/api/v1/users/push-token`

Headers:

```http
Authorization: Bearer {{token}}
Content-Type: application/json
```

Body:

```json
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "provider": "expo",
  "platform": "android",
  "deviceId": "device-001"
}
```

Expected response:

```json
{
  "message": "Push token saved successfully",
  "pushToken": {
    "provider": "expo",
    "platform": "android",
    "deviceId": "device-001",
    "lastSeenAt": "2026-07-29T00:00:00.000Z"
  }
}
```

The raw push token is intentionally not returned.

#### DELETE `/api/v1/users/push-token`

Headers:

```http
Authorization: Bearer {{token}}
Content-Type: application/json
```

Body:

```json
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "provider": "expo",
  "deviceId": "device-001"
}
```

Expected response:

```json
{
  "message": "Push token revoked successfully",
  "revoked": true
}
```

The revoke API is idempotent. Calling it again should still return `200`.

### Manual Push Test

Recommended device:

- Android physical device with Expo Go or a development build.
- iOS physical device with a development build for reliable push testing.

Steps:

1. Start backend.
2. Start frontend with `npx expo start -c`.
3. Login on the mobile app and allow notifications.
4. Open MongoDB Atlas, collection `users`.
5. Check that the logged-in user has `pushTokens[0].token` with `ExponentPushToken[...]`.
6. Login with another matched account.
7. Put the target user's app in background, or close it.
8. Create a match or send a chat message.
9. The target device should receive a notification.
10. Tap the notification. The app should navigate to the related chat flow.

Local demo note:

- Push notification code can be demonstrated through tests and MongoDB token storage.
- Real status-bar notifications require a valid Expo project id and a supported physical device.

---

## Known Limitations And Notes

- Firebase Cloud Messaging is no longer required for the current Expo push notification approach.
- Real push notification delivery still requires Expo/EAS project setup and a supported physical device.
- Redis is optional in local development because fallback to MongoDB exists.
- Cloudinary upload requires valid Cloudinary environment variables.
- Socket.IO events are best tested with the mobile app or a Socket.IO client, not normal Postman REST requests.
- The root `package.json` is not the main app package. Use `backend/package.json` and `frontend/package.json`.
- MongoDB Atlas works. Make sure your IP address is allowed in Atlas Network Access.

---

## Common Problems

### `Route not found`

Check the exact mounted path. Important current paths:

```text
POST /api/v1/swipes
PUT  /api/v1/users/profile
GET  /api/v1/users/explore
GET  /api/v1/messages/:matchId
GET  /api/matches
POST /api/chats/:matchId/messages
```

### `Authentication token is required`

Add:

```http
Authorization: Bearer <token>
```

### Explore returns empty list

Check:

- Candidate location is near the query `lat/lng`
- Current user's `genderPreference`
- Candidate's `interestedIn` includes current user's gender
- Candidate age is inside current user's min/max age
- User was not already swiped

### MongoDB Atlas cannot connect

Check:

- `MONGO_URI` in `backend/.env`
- Atlas username/password
- Database user permissions
- Atlas Network Access IP whitelist

### Redis command not found or Docker unavailable

Redis is optional for local dev. The app should still work through MongoDB fallback.

---

## Contributors

- Vu Tuan Dat
- Vu Duc
- Project Team Members

---

## License

This project is licensed under the MIT License. See `LICENSE` for details.
