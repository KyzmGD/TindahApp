# Changelog

All notable changes to Tindah are recorded here. The project remains pre-1.0 even
though application package metadata currently reports `1.0.0`.

## Unreleased

### Added

- Gamer profiles, lobby discovery and statistics, plus recruitment create/join/leave/close workflows.
- Team conversations whose membership follows gamer recruitment state.
- Profile image uploads through Cloudinary with local development fallback.
- Expo push-token registration and offline match/message notifications.
- Presence, typing, read receipts, unread counts, and message retries using `clientMessageId`.
- Redis-cached swipe exclusions with a 24-hour TTL and MongoDB fallback.
- Advanced discovery filters and a search-preference backfill script.
- Broad backend tests and a configurable k6 reciprocal-swipe scenario with sanitized output.
- Swagger UI and expanded installation, API, architecture, operations, and project documentation.

### Changed

- Auth, swipe, user, and upload APIs expose preferred `/api/v1` mounts while retaining legacy paths.
- Discovery and matching operations guard against duplicate concurrent writes.
- The Expo client supports responsive mobile and desktop-web product flows.

### Security

- Match and recruitment membership is checked before scoped chat and realtime actions.
- Upload MIME types and size are restricted, and selected user content is filtered.

## [0.1.0] - 2026-06-19

### Added

- JWT authentication and profile management.
- Swipe and reciprocal matching.
- Socket.IO chat and conversation history.
- React Native/Expo frontend and Express/MongoDB backend.
- Initial installation, API, and contribution documentation.

### Notes

This was the first public snapshot. APIs and schemas were explicitly unstable.
