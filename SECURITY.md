# Security Policy

## Supported versions

The project is pre-1.0. Security fixes are applied to the current default branch;
historical snapshots are not guaranteed to receive patches.

| Version | Supported |
| --- | :---: |
| Current default branch | Yes |
| Historical releases | No |

## Reporting a vulnerability

Do not open a public issue, discussion, or pull request for a suspected
vulnerability. Contact maintainers privately through the repository owner's
published security contact or GitHub private vulnerability reporting when enabled.

Include the affected route, component, version or commit; impact; minimal
reproduction steps; required privileges; and a suggested mitigation if known.
Do not access data that is not yours, disrupt shared services, run denial-of-service
tests, or disclose details before maintainers can investigate and remediate.

## Deployment security notes

- Replace the development JWT fallback with a long random `JWT_SECRET` and manage it securely.
- Use TLS for the API, MongoDB, Redis, and external integrations.
- Restrict CORS and Socket.IO `CLIENT_ORIGIN` to trusted production origins.
- Never commit `.env`, Cloudinary secrets, Expo tokens, database URLs, JWTs, push tokens, or user data.
- Limit MongoDB and Redis network access and grant least-privilege credentials.
- Apply request/rate limits and abuse monitoring at the deployment edge; the app has no comprehensive global limiter.
- Treat local uploads as development-only storage and do not place sensitive files in `backend/public/uploads`.
- Validate backup restoration, log redaction, retention, and account-deletion procedures before production use.

`GET /health` reports only that the HTTP process is running; it does not prove that
dependencies or security controls are healthy.
