# API Documentation

## Authentication

POST /api/auth/register

POST /api/auth/login

## User

GET /api/users/profile

PUT /api/users/profile

## Match

POST /api/v1/swipes

Request body:

```json
{
  "targetId": "USER_ID",
  "type": "like"
}
```

`type` can be `like` or `pass`. A reciprocal `like` creates a match and returns `isMatch: true`.

POST /api/swipes

GET /api/matches

## Chat

GET /api/chats

POST /api/chats/message
