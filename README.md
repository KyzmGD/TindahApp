# Tinder Clone

Full-stack starter for a Tinder-style dating app clone.

## Structure

- `back-end`: Express, MongoDB, JWT auth, swipe/match logic, chat API, Socket.IO.
- `frontend`: Expo React Native app with auth, swipe cards, matches, chat and profile screens.
- `docs`: project documents.

## Run Backend

```bash
cd back-end
cp .env.example .env
npm install
npm run dev
```

## Run Frontend

```bash
cd frontend
npm install
npm start
```

Set `EXPO_PUBLIC_API_URL` if your API is not at `http://localhost:5000/api`.
