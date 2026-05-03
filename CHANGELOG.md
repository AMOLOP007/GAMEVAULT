# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-05-03
### "Stabilization Update"

### Added
- **State-of-the-Art Prediction Engine**: Reconstructs historical play sessions from Steam 2-week metrics with high fidelity.
- **Local Playtime Discovery**: Desktop app now reads `Playtime2Weeks` and `TotalPlaytime` directly from Steam's local files.
- **Enhanced Syncing**: Automated background sync for Steam metadata and achievements.

### Fixed
- **Playtime Protection**: Implemented "High-Value Wins" policy—never downgrade accurate local playtime with less accurate web data.
- **Performance**: Optimized tab-switching latency by 40% using `popLayout` transitions and reduced animation overhead.
- **API Reliability**: Fixed startup crash related to environment variable loading order.
- **Metadata Accuracy**: Improved Steam scraper to prefer `hoursOnRecord` for lifetime playtime.
- **Database Schema**: Synchronized `playtime2Weeks` metric across all models and services.

### Changed
- Refined Dashboard "Momentum Engine" graph to use organic "smearing" distribution instead of daily spikes.
- Updated UI transitions to 150ms duration for a snappier feel.
