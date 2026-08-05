# Roadmap

This roadmap describes direction, not a release commitment. Priorities can change
after testing and user feedback.

## Delivered foundation

- JWT registration, login, session restoration, and profile editing
- Preference-, location-, age-, and gender-aware discovery
- Idempotent swipes, reciprocal matches, and unmatching
- Direct and gamer-team chat with history, retries, typing, presence, unread state,
  and read receipts
- Gamer profiles, lobby discovery, recruitment creation, join, leave, and close
- JPG/PNG/WEBP uploads through Cloudinary with a development local fallback
- Offline Expo match and message notifications
- Redis swipe-exclusion cache with MongoDB fallback
- Backend unit, integration, route, socket, notification, and cache tests
- Configurable k6 reciprocal-swipe load scenario

## Next: hardening

- Add continuous integration for tests, dependency auditing, and documentation checks
- Establish and publish repeatable load-test baselines
- Add production observability, structured logs, metrics, and alerting
- Review rate limiting, abuse controls, secret management, and data-retention policy
- Expand end-to-end coverage across web and physical mobile devices
- Automate media cleanup and optimize image transformations

## Later: product expansion

- Improve match ranking with explainable compatibility signals
- Add account verification and moderation workflows
- Expand gamer-lobby filters, party management, and game coverage
- Add accessible localization and notification preferences
- Validate premium features through product research before implementation

## Release readiness

A 1.0 release requires reproducible deployment and rollback procedures, CI passing
on supported platforms, monitored production infrastructure, reviewed security and
privacy controls, migration/backup plans, and documented service-level objectives.
