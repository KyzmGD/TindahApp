# Installation Guide

This guide sets up the Tindah API and Expo client for local development. The
backend and frontend are separate npm projects; the root `package.json` is not an
application workspace.

## Prerequisites

- Node.js 20 or newer and npm
- MongoDB (local instance or Atlas cluster)
- Redis 7.x (optional; discovery falls back to MongoDB)
- Expo Go, an Android/iOS emulator, or a web browser
- k6 only when running the swipe load test

## Install dependencies

```bash
git clone <repository-url>
cd Tindah

cd backend
npm install

cd ../frontend
npm install
```

## Configure the backend

Copy the example environment file from the repository root:

```bash
# macOS / Linux
cp backend/.env.example backend/.env

# Windows PowerShell
Copy-Item backend/.env.example backend/.env
```

At minimum, replace `MONGO_URI` and `JWT_SECRET`:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/tinderapp
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:8081
PUBLIC_BASE_URL=http://localhost:5000
```

Optional integrations:

| Variable | Purpose |
| --- | --- |
| `REDIS_URL` | Cache swipe exclusions, for example `redis://localhost:6379` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `EXPO_ACCESS_TOKEN` | Token for secured Expo push projects |

Never commit `.env` or real credentials. Without Redis, the API reads swipe
history from MongoDB. Without Cloudinary, development uploads are stored in
`backend/public/uploads`; production upload failures do not fall back locally.

## Start and verify the API

```bash
cd backend
npm run dev
```

Verify the server at `http://localhost:5000/health`. Swagger UI is available at
`http://localhost:5000/api-docs`. A healthy response resembles:

```json
{
  "status": "ok",
  "service": "tinder-clone-api",
  "timestamp": "<ISO-8601 timestamp>"
}
```

The health endpoint confirms that the HTTP process is running; it does not prove
that MongoDB or optional integrations are available.

## Configure and start the client

The client defaults to `http://localhost:5000/api`. Start it in another terminal:

```bash
cd frontend
npm start
```

Expo offers web, Android, and iOS targets. Direct commands are also available:

```bash
npm run web
npm run android
npm run ios
```

For a physical device, create `frontend/.env` and use the development computer's
LAN address:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:5000/api
```

Keep the phone and computer on the same network, allow port `5000` through the
firewall, and restart Expo after changing environment variables. Push
notifications require a supported physical device and a valid EAS `projectId` in
`frontend/app.json`.

## Run tests

```bash
cd backend
npm test
```

Jest uses MongoDB Memory Server and clears collections between tests. It does not
use the configured development database. The first run can download a MongoDB
binary and therefore may require network access.

See [LOAD_TESTING.md](LOAD_TESTING.md) for the k6 scenario and [REDIS.md](REDIS.md)
for optional cache setup.

## Troubleshooting

- If database requests fail, verify `MONGO_URI`, Atlas credentials, permissions,
  and the Atlas IP access list.
- If a phone cannot reach the API, use the computer's LAN IP rather than
  `localhost`, then run `npx expo start -c`.
- If discovery is empty, check profile coordinates, age and gender preferences,
  distance limits, and prior swipes. Coordinates are `[longitude, latitude]`.
- If local uploads return unreachable URLs, make `PUBLIC_BASE_URL` reachable from
  the client device.
