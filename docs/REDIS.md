# Redis Swipe Cache

Redis is an optional acceleration layer for discovery. MongoDB remains the source
of truth, and the API continues operating if Redis is absent or unavailable.

## Cached data

Discovery excludes profiles already swiped by the current user. The cache stores
those target IDs in a Redis Set:

```text
swipe:excluded:{userId}
```

Sets expire after 86,400 seconds (24 hours). On a cache miss, the service reads the
user's swipe history from MongoDB and populates the Set when at least one target
exists. After a new swipe, the target ID is added and the 24-hour TTL is refreshed.
Invalid cached ObjectIds are discarded.

## Local setup

Start Redis 7 with Docker:

```bash
docker run --name tindah-redis -p 6379:6379 redis:7-alpine
```

Set the backend variable and restart the API:

```env
REDIS_URL=redis://localhost:6379
```

```bash
cd backend
npm run dev
```

The server logs `Redis connected` on success. If `REDIS_URL` is unset, connection
takes longer than three seconds, or the connection fails, startup continues without
the cache.

## Verification

After a user swipes, inspect the Set with `redis-cli`:

```text
SMEMBERS swipe:excluded:<userId>
TTL swipe:excluded:<userId>
```

The target ID should be present and TTL should be between 1 and 86,400. A key with
no swipe history is intentionally not created.

## Failure behavior

Read and write errors are logged as warnings. Reads immediately fall back to a
MongoDB query; failed cache writes do not fail the swipe request. Because Redis is
not authoritative, deleting these keys is safe and causes lazy repopulation.

## Testing and measurement

Run the backend Jest suite to cover cache hits, misses, updates, and fallback:

```bash
cd backend
npm test -- --runInBand tests/swipeCache.test.js
```

For performance comparisons, run the same discovery workload with Redis disabled,
enabled, and deliberately offline. Record request count, average and p95 latency,
errors, MongoDB query load, and environment details. Treat lower latency as a
measured outcome rather than assuming a fixed improvement percentage.
