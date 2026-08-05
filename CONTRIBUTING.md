# Contributing Guide

Thank you for contributing to Tindah. Keep changes focused, test behavior that can
regress, and update the relevant detailed guide when interfaces or workflows change.

## Development setup

Use Node.js 20 or newer. Install and run the two applications independently:

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
npm start
```

Copy `backend/.env.example` to `backend/.env` and set a development `MONGO_URI` and
`JWT_SECRET`. Redis and Cloudinary are optional locally. See
`docs/INSTALLATION.md` for device and integration setup.

## Workflow

1. Fork or branch from the current default branch.
2. Create a focused branch such as `feat/gamer-filters` or `fix/message-retry`.
3. Make the smallest cohesive change and add or update tests.
4. Run the relevant verification commands.
5. Commit with a concise Conventional Commit message.
6. Open a pull request that explains behavior, verification, and any migration or configuration impact.

Examples:

```text
feat: add lobby rank filter
fix: prevent duplicate retry messages
docs: update API examples
test: cover Redis fallback
```

## Project conventions

### Backend

- Keep route definitions thin and reusable domain behavior in services.
- Preserve authorization checks for every user-, match-, and recruitment-scoped operation.
- Make retried and concurrent mutations idempotent where practical.
- Never make Redis the source of truth or require optional integrations for core local workflows.

### Frontend

- Prefer functional components and hooks.
- Keep HTTP logic in `frontend/src/services` and shared session or realtime state in contexts.
- Support mobile and web layouts, including loading, empty, retry, and error states.
- Preserve accessibility labels and avoid relying on color alone for meaning.

### Documentation

- Document implemented behavior, not planned behavior as if it exists.
- Update `docs/API.md` when routes, payloads, or Socket.IO events change.
- Update other focused guides when their assumptions change.
- Do not include secrets, real tokens, user data, or load-test credentials.

## Verification

```bash
cd backend
npm test
```

Jest uses MongoDB Memory Server. The first run may download a MongoDB binary. The
frontend currently has no automated test or lint script, so exercise affected flows
on the relevant Expo targets and describe manual verification in the pull request.
For performance work, follow `docs/LOAD_TESTING.md` against non-production data.

## Pull request checklist

- [ ] The description explains the scope and reason for the change.
- [ ] Relevant tests pass and new behavior has coverage where practical.
- [ ] Affected web/mobile flows were manually verified.
- [ ] API, environment, schema, migration, and documentation impacts are included.
- [ ] No credentials, generated test users, private data, or unrelated files are included.
- [ ] Breaking changes and deployment or rollback steps are called out.
