# Tab Tidy

[![CI](https://github.com/aakarshika/tab-tidy/actions/workflows/ci.yml/badge.svg)](https://github.com/aakarshika/tab-tidy/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A one-click Chrome extension that cleans up tab chaos. It merges all your windows into one, closes duplicate tabs, groups related tabs by domain, and keeps the sites you always use pinned in a fixed order.

No accounts, no network requests and no tracking: everything happens locally in your browser.

<p align="center">
  <img src="docs/popup.png" width="300" alt="The Tab Tidy popup after a cleanup: window, tab and pin counts, five pinned anchor tabs, a log of what changed and the domain groups created">
</p>

## What a cleanup does

Click the toolbar icon and press **Run cleanup**:

1. **Resolves your anchor tabs.** For each site in your anchor list it keeps one tab and pins it. If you were actively using an unpinned copy, that copy becomes the pin and stale pins are closed.
2. **Removes duplicates.** Unpinned tabs with exactly the same URL are closed, keeping the first one.
3. **Merges windows.** Every tab moves into your focused window (or the biggest window if none is focused).
4. **Opens missing anchors.** Any anchor site without a tab gets opened and pinned.
5. **Sorts pinned tabs** into the order you configured.
6. **Places a "first" tab.** An optional tab (by default a local dev server) is placed right after the pins, and opened if it's missing.
7. **Groups by domain.** Any root domain with 2 or more unpinned tabs gets its own colored tab group.

The popup shows a live summary (windows, tabs, pins and the state of each anchor) and a log of what changed.

> [!WARNING]
> A cleanup **closes tabs** (duplicates and extra copies of anchor sites). You can bring them back with <kbd>Ctrl/Cmd</kbd>+<kbd>Shift</kbd>+<kbd>T</kbd> or from Chrome's history.

## Install

Tab Tidy isn't on the Chrome Web Store yet, so you install it from source:

1. Clone this repo (or download it as a ZIP and unzip it):
   ```bash
   git clone https://github.com/aakarshika/tab-tidy.git
   ```
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the **`src/`** folder inside the repo.
5. Pin Tab Tidy to your toolbar from the puzzle-piece menu.

Works in Chrome and other Chromium browsers (Edge, Brave, Arc) that support Manifest V3 and tab groups.

## Configure

All settings live in [`src/config.js`](src/config.js). The defaults are the author's own setup, so you'll probably want to change them.

```js
export const PINNED_ANCHORS = [
  { name: 'Gmail',    match: 'mail.google.com', url: 'https://mail.google.com', color: 'blue' },
  { name: 'Calendar', match: 'calendar.google.com', url: 'https://calendar.google.com', color: 'green' },
];

// Set to null if you don't want a tab placed after the pins.
export const FIRST_UNPINNED_TAB = null;
```

| Field   | Meaning |
| ------- | ------- |
| `name`  | Label shown in the popup. |
| `match` | Host, optionally followed by a path prefix (`claude.ai/design`). If several anchors match one tab, the longest pattern wins. |
| `url`   | What to open when no tab matches. |
| `color` | One of Chrome's tab group colors: `grey`, `blue`, `red`, `yellow`, `green`, `pink`, `purple`, `cyan`, `orange`. |

After editing, click the reload icon on Tab Tidy's card in `chrome://extensions`.

## Permissions

| Permission  | Why |
| ----------- | --- |
| `tabs`      | Read tab URLs to match anchors, find duplicates and group by domain. |
| `tabGroups` | Create, name and color the per-domain tab groups. |

Tab Tidy makes no network requests and stores no data.

## Project structure

```
src/                      ← the extension (load this folder in Chrome)
├── manifest.json
├── config.js             ← user settings
├── background/
│   ├── index.js          ← service worker entry: message handler
│   ├── tidy.js           ← the cleanup steps, in order
│   ├── preview.js        ← read-only summary for the popup
│   ├── grouping.js       ← per-domain tab groups
│   ├── matching.js       ← pure URL helpers (unit tested)
│   └── tabs.js           ← chrome.tabs / chrome.windows wrappers
├── popup/                ← toolbar popup UI
└── icons/
test/                     ← unit tests (node --test)
scripts/                  ← manifest check and release packaging
docs/                     ← images for this README
```

There is no build step: the files in `src/` are exactly what Chrome runs. Node is only used for linting, tests and packaging.

## Contributing

Bug reports, ideas and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) to get set up. Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)
