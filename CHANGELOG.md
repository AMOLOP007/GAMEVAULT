# Changelog

## [1.4.0] - 2026-05-25

### Security Hardening
- Removed sensitive `.env` configurations from git tracking.
- Replaced hardcoded store encryption keys with secure, machine-derived keys.
- Added authentication to all internal `admin` and `social` API routes to prevent unauthorized access.
- Fixed chat messaging endpoint to correctly attribute user IDs.
- Eliminated command injection vulnerabilities in the Game Launcher module.
- Sanitized API error handlers to avoid leaking internal system details in production.
- Disabled the local development login backdoor in production builds.

### Performance Optimization
- **Adaptive Tracker Polling**: Reduced CPU usage significantly by pausing heavy scanning when no games are active for extended periods.
- **Background Processes**: Minimized API health checks and background jobs when the app is idling in the system tray.
- **Event-Driven Sync**: Overhauled the background data sync service to only fire exactly when necessary instead of blindly pinging the server every 2 minutes.
- **Overlay Window Management**: The achievement trophy overlay now automatically destroys itself to reclaim memory (15-20MB RAM) when no achievements are queued.
- **Library Scanning Cache**: Added caching logic to avoid redundant hard drive scans during the same app session.
- **Dynamic Import Preloading**: Hot-paths now preload heavier modules on startup to ensure instant responses during active gameplay.

### Integrity & Tamper Protection
- Enabled ASAR integrity checking in `electron-builder.config.js`. Setup files now verify all inner bundles against SHA-256 hashes to prevent tampering.
- Prepared the build pipeline for Windows Authenticode signing.

### Bug Fixes
- Fixed an issue with SQLite PRAGMAs causing errors on the Postgres backend.
- Resolved variable shadowing inside the core scan logic.
- Cleaned up obsolete validation middleware files.
