# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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

[Unreleased]: https://github.com/aakarshika/tab-tidy/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/aakarshika/tab-tidy/releases/tag/v0.0.1
