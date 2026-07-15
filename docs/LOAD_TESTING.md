# Swipe Load Testing

## Goal

`load-tests/swipes-load-test.js` simulates 100 concurrent virtual users for one minute.
The users are grouped into 50 pairs. Each member repeatedly sends a reciprocal
`POST /api/v1/swipes` `like` request to the other member of its pair. This exercises
the matching engine, idempotency, and MongoDB unique indexes under concurrent
reciprocal likes.

The script automatically creates 100 uniquely named test accounts during `setup()`.
Registration time is excluded from the custom swipe metrics.

Do not run this against production or a database containing real accounts. Point the
backend at a dedicated local, development, or staging MongoDB database first.

## Install k6 on Windows

Open PowerShell and run:

```powershell
winget install k6 --source winget
k6 version
```

Close and reopen PowerShell if `k6` is not found after installation.

## Run the test

1. Configure `backend/.env` with a development/staging `MONGO_URI`, then start the API:

   ```powershell
   cd backend
   npm run dev
   ```

2. In a second PowerShell window, from the repository root, run:

   ```powershell
   k6 run load-tests/swipes-load-test.js
   ```

   The default target is `http://localhost:5000`, with 100 virtual users for one minute.
   To target another environment, set `BASE_URL` before the command:

   ```powershell
   $env:BASE_URL = "http://localhost:5000"
   k6 run load-tests/swipes-load-test.js
   ```

3. Read the terminal summary and keep `load-tests/results/swipes-summary.json` as the
machine-readable test report. The script writes a sanitized JSON report that excludes
`setup()` data and JWT tokens. Do not use k6's native `--summary-export` for this
script because that export can include generated test credentials.

## Pass criteria

The run exits with a non-zero code when any required criterion fails:

| Metric | Requirement | Meaning |
| --- | --- | --- |
| `swipe_http_500_rate` | `rate == 0` | No API response with HTTP 500 |
| `swipe_response_time` | `avg <= 200 ms` | Average duration of only `POST /api/v1/swipes` requests |
| `swipe_http_error_rate` | `rate == 0` | Every swipe receives HTTP 201 |
| `checks` | `rate == 1` | Responses also contain a boolean `isMatch` |

`swipe_requests` is the total number of swipe requests sent during the one-minute
scenario. `swipe_http_503_rate` is diagnostic: any non-zero value usually means the
API is rejecting requests due to overload, timeout, or temporary contention. k6 also
displays `http_reqs` and request-rate metrics. A successful run
confirms the server stayed responsive at this load; review backend logs and MongoDB
metrics too, looking for process restarts, unhandled errors, or database connection
failures.

## Record the result

Fill in this table after each run. Do not mark the task complete only because the
script ran: the final values must satisfy the thresholds above.

| Run date | Target | VUs | Duration | Swipe requests | HTTP 500 rate | Average swipe response | Result |
| --- | --- | ---: | --- | ---: | ---: | ---: | --- |
| ____ | ____ | 100 | 1 minute | ____ | ____ | ____ ms | PASS / FAIL |

## Cleanup test data

The script intentionally does not delete data automatically. Its test accounts use
emails beginning with `k6-swipe-` and can be removed only from the dedicated test
database after the report has been saved. Delete related `swipes` and `matches` first,
then delete the matching users; never run cleanup queries against
production data.
