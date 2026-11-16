# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.0.2] - 2026-11-15

### Added
- [Privacy policy](PRIVACY.md) and Chrome Web Store listing materials ([CHROMEWEBSTORE.md](CHROMEWEBSTORE.md), images in `store/`).

### Fixed
- Cleanups no longer close other tabs from an anchor's site. The copy you used most recently is pinned and the rest stay open; older pins are unpinned instead of closed. Running a cleanup again leaves the pins as they are. Only exact duplicates are ever closed.
- Cleanups no longer remove your tab groups. Merging windows moves whole groups so they arrive intact, loose tabs join the group an earlier cleanup made for their site, and groups you made yourself are left alone.
- The first unpinned tab is no longer pulled into a domain group, so it stays right after the pinned tabs.

### Changed
- Clearer extension description, which is also the Chrome Web Store summary.
- The 128 px icon now has the transparent padding Chrome recommends, so it no longer looks oversized next to other extensions.

## [0.0.1] - 2026-11-15

First public release.

### Added
- One-click cleanup from the toolbar popup: merges all windows into one, closes duplicate tabs and groups tabs by domain (any domain with 2 or more tabs gets its own colored group).
- Pinned anchors: a list of sites kept open as pinned tabs in a fixed order. If you were using an unpinned copy, that copy becomes the pin and stale pins are closed. Missing anchors are opened.
- Optional first unpinned tab, such as a local dev server, kept right after the pinned tabs.
- Popup with a live summary (windows, tabs, pins and each anchor's state) and a log of what each cleanup changed.
- Settings page (popup → **Settings**, or right-click the icon → **Options**): add, remove and reorder anchors, pick their colors, edit or turn off the first unpinned tab, and reset to defaults. Input is checked before saving, and settings sync through your Chrome account.
- New installs start with no anchors and the first unpinned tab off, so a first cleanup never opens or closes sites you didn't choose. The Settings page opens once on install so you can add your own.
- Uses only the `tabs`, `tabGroups` and `storage` permissions. No network requests, no data collection.

[Unreleased]: https://github.com/aakarshika/tab-tidy/compare/v0.0.2...HEAD
[0.0.2]: https://github.com/aakarshika/tab-tidy/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/aakarshika/tab-tidy/releases/tag/v0.0.1
