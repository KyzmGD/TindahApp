# Redis Cache Setup

This project uses Redis to cache swipe exclusion lists for discovery.

## Purpose

Discovery needs to exclude users that the current user already swiped.
Without Redis, the API reads swipe history from MongoDB on every discovery request.
With Redis, the API first reads a Set of excluded target IDs from:

```text
swipe:excluded:{userId}
```

Example:

```text
swipe:excluded:65b000000000000000000001
```

Each key has a TTL of 24 hours.

## Local Redis

Recommended local setup with Docker:

```bash
docker run --name tindah-redis -p 6379:6379 redis:7-alpine
```

Set backend environment:

```env
REDIS_URL=redis://localhost:6379
```

Start backend:

```bash
cd backend
npm run dev
```

## Verify Key And TTL

After a user swipes another user, open Redis CLI:

```bash
redis-cli
```

Check the key:

```bash
SMEMBERS swipe:excluded:<userId>
TTL swipe:excluded:<userId>
```

Expected TTL is close to:

```text
86400
```

## Fallback Behavior

If Redis is offline, unavailable, or times out, discovery falls back to MongoDB.
The API must keep responding instead of returning 500 due to Redis failure.

## Performance Measurement

Before merging Redis cache changes, measure discovery response time before and after Redis.
Use Postman Runner, k6, or another HTTP benchmark tool with 50 requests.

| Case | Requests | Avg response time | Note |
| --- | ---: | ---: | --- |
| Before Redis | 50 | ___ ms | Query MongoDB directly |
| Redis online | 50 | ___ ms | Read excluded IDs from Redis |
| Redis offline | 50 | ___ ms | Fallback MongoDB, no 500 |

Acceptance target:

```text
Redis online avg response time is at least 30% lower than baseline.
```
