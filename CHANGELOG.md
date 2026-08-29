# Changelog

All notable changes to **gitswitch** (npm package **`gitswitch-wizard`**) are
documented here. This project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

- Cross-platform support (Linux + macOS) with a CI matrix and platform guard.
- Documentation refresh.

## [2.4.0] - 2026-08-29

### Added
- Linux + macOS support. GitSwitch relies on OpenSSH, which ships on both; a
  clear guard refuses unsupported OSes. CI now runs on `ubuntu-latest` and
  `macos-latest`.

## [2.3.0] - 2026-08-29

### Added
- `gitswitch update` now pulls the latest CLI from the npm registry (offers
  `npm install -g gitswitch-wizard@latest`), then updates the engine binary in
  place — a single command keeps you current.
- `gitswitch install` / `gitswitch wizard` aliases for the interactive wizard.

### Security
- Update/install never touches foreign SSH entries or unrelated keys — only
  GitSwitch-managed blocks, with a backup.

## [2.2.4] - 2026-08-29

### Changed
- Uninstall message documents the `hash -r` / new-terminal guidance for
  `command not found` vs the current shell's cached path.

## [2.2.3] - 2026-08-28

### Added
- **Complete uninstall** — removes the engine binary from every known location
  (`/usr/local/bin` and `~/.local/bin`), deletes ALL accounts & backups
  (`~/.gitswitch`), strips GitSwitch-managed SSH config blocks (with a
  timestamped backup), removes the `gitswitch-wizard` npm package and every
  PATH / SSH-agent marker — so afterwards `gitswitch` reports `command not found`.
- One-confirmation removal.

## [2.2.2] - 2026-08-28

### Fixed
- `ReferenceError: path is not defined` crash in `cleanRcMarkers` during
  uninstall. Proper `node:` imports + regression tests.

## [2.2.1] - 2026-08-28

### Changed
- Engine `GS_VERSION` lockstepped to the npm package so the wizard stopped
  nagging to update.

[2.4.0]: https://github.com/DonArtkins/gitswitch/releases/tag/v2.4.0
[2.3.0]: https://github.com/DonArtkins/gitswitch/releases/tag/v2.3.0
[2.2.4]: https://github.com/DonArtkins/gitswitch/releases/tag/v2.2.4
[2.2.3]: https://github.com/DonArtkins/gitswitch/releases/tag/v2.2.3
[2.2.2]: https://github.com/DonArtkins/gitswitch/releases/tag/v2.2.2
[2.2.1]: https://github.com/DonArtkins/gitswitch/releases/tag/v2.2.1
