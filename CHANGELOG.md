# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed
- Reorganized the project for open source: the extension now lives in `src/`, the background script is split into ES modules and the popup has separate HTML, CSS and JS files.
- User settings moved to `src/config.js`.
- `FIRST_UNPINNED_TAB` can be set to `null` to turn that step off.
- The popup reads its version label from the manifest.

### Fixed
- Removed the invalid `windows` permission from the manifest. `chrome.windows` doesn't need one.
- The "No windows found" message now displays correctly in the popup.
- The popup builds DOM nodes with `textContent` instead of `innerHTML`.

### Added
- MIT license, contributor docs, issue and PR templates.
- ESLint, unit tests for URL matching, a manifest check and a packaging script.
- GitHub Actions CI.

## [1.1]

- Merge all windows into one, remove duplicate tabs and group tabs by domain.
- Keep a configured set of anchor sites pinned in a fixed order, preferring the copy you were actively using.
- Place a configured tab (e.g. a local dev server) right after the pinned tabs.
- Popup with a live summary and a log of each cleanup.
