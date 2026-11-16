# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed
- New installs start with no pinned anchors and the first unpinned tab turned off, so a first cleanup never opens or closes sites you didn't choose. The old defaults were the author's personal setup.
- Reorganized the project for open source: the extension now lives in `src/`, the background script is split into ES modules and the popup has separate HTML, CSS and JS files.
- Settings are edited on the new options page instead of in code. `src/config.js` now holds the defaults, which apply until you save your own settings.
- The first unpinned tab can be turned off (on the options page, or with `FIRST_UNPINNED_TAB = null` in the defaults).
- The popup reads its version label from the manifest.

### Fixed
- Removed the invalid `windows` permission from the manifest. `chrome.windows` doesn't need one.
- The "No windows found" message now displays correctly in the popup.
- The popup builds DOM nodes with `textContent` instead of `innerHTML`.

### Added
- The Settings page opens automatically when Tab Tidy is first installed.
- Options page (popup → **Settings**, or right-click the icon → **Options**): add, remove and reorder pinned anchors, choose their colors, edit or turn off the first unpinned tab, and reset to defaults. Input is checked before saving.
- `storage` permission, used to save settings in `chrome.storage.sync`.
- MIT license, contributor docs, issue and PR templates.
- ESLint, unit tests for URL matching and settings validation, a manifest check and a packaging script.
- GitHub Actions CI.

## [0.0.1]

- Merge all windows into one, remove duplicate tabs and group tabs by domain.
- Keep a configured set of anchor sites pinned in a fixed order, preferring the copy you were actively using.
- Place a configured tab (e.g. a local dev server) right after the pinned tabs.
- Popup with a live summary and a log of each cleanup.
