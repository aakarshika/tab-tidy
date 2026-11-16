# Contributing to Tab Tidy

Thanks for your interest in helping out! This guide covers how to get set up, how the code is laid out, and what a good pull request looks like.

## Ways to contribute

- **Report a bug:** [open an issue](https://github.com/aakarshika/tab-tidy/issues/new/choose) with steps to reproduce.
- **Suggest a feature:** open an issue first so we can agree on the approach before you write code.
- **Send a pull request:** issues labeled [`good first issue`](https://github.com/aakarshika/tab-tidy/labels/good%20first%20issue) are a good place to start.

## Development setup

You need Chrome (or another Chromium browser) and [Node.js](https://nodejs.org/) 20 or newer.

```bash
git clone https://github.com/aakarshika/tab-tidy.git
cd tab-tidy
npm install
```

Load the extension:

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select the `src/` folder.

After changing code, click the reload icon on Tab Tidy's card. Popup changes show up the next time you open the popup; background changes need the reload.

### Debugging

- **Service worker (background):** on `chrome://extensions`, click **Inspect views: service worker** under Tab Tidy.
- **Popup:** open the popup, right-click inside it and choose **Inspect**.

> [!TIP]
> Try your changes in a separate Chrome profile so a bug doesn't close your real tabs.

## Project layout

| Path | What lives there |
| ---- | ---------------- |
| `src/config.js` | User settings: anchors, first tab, group colors. |
| `src/background/tidy.js` | The cleanup, one numbered step at a time. Start reading here. |
| `src/background/matching.js` | Pure URL logic with no `chrome.*` calls. Has unit tests. |
| `src/background/tabs.js` | Small wrappers around `chrome.tabs` / `chrome.windows`. |
| `src/background/grouping.js` | Per-domain tab groups. |
| `src/background/preview.js` | Read-only summary shown when the popup opens. |
| `src/background/index.js` | Service worker entry point and message handler. |
| `src/popup/` | Popup HTML, CSS and JS. |
| `test/` | Unit tests, run with Node's built-in test runner. |
| `scripts/` | Manifest check and release packaging. |

The popup and service worker talk through `chrome.runtime.sendMessage` with two actions, `preview` and `tidy` (see `src/background/index.js`).

## Before you open a pull request

Run all the checks. CI runs the same ones:

```bash
npm run check
```

That runs ESLint, the unit tests and the manifest check. You can also run them on their own with `npm run lint`, `npm test` and `npm run check:manifest`.

Most of the extension talks to Chrome APIs that the unit tests can't reach, so **also test by hand** in Chrome. Here's a quick scenario that exercises every step:

- [ ] Two or more windows open.
- [ ] Duplicate tabs (same URL twice).
- [ ] One anchor site open twice: once pinned, once unpinned.
- [ ] One anchor site not open at all.
- [ ] Three or more tabs from the same domain (e.g. `github.com`).
- [ ] Run cleanup: one window remains, anchors are pinned in config order, duplicates are gone, domain groups appear and the popup log matches what happened.
- [ ] If you touched `FIRST_UNPINNED_TAB` handling, also try it set to `null`.

## Guidelines

- **Keep it dependency-free at runtime.** No frameworks, no bundler, no build step. `src/` must stay loadable as-is.
- **Put new pure logic in `matching.js`** (or a new module without `chrome.*` calls) and add tests for it in `test/`.
- **Be careful with permissions.** Adding a permission changes the install warning for every user. Explain why in the PR.
- **Never use `innerHTML` with tab data.** Page titles and URLs come from websites. Build DOM nodes and set `textContent` (see `el()` in `popup.js`).
- **Keep your personal config out of PRs.** If you've customized `src/config.js` for your own browsing, leave those changes out unless the PR is about the defaults.
- **Small, focused PRs** are much easier to review than large ones.
- **Update [CHANGELOG.md](CHANGELOG.md)** under *Unreleased* for any user-visible change.

Code style is enforced by ESLint and [`.editorconfig`](.editorconfig): 2-space indentation, ES modules, `const` by default. Vertically aligning related lines is welcome where it helps readability.

## Releasing (maintainers)

1. Bump `version` in `src/manifest.json`.
2. Move the *Unreleased* entries in `CHANGELOG.md` under the new version.
3. Commit, then tag: `git tag v1.2 && git push --tags`.
4. Run `npm run package` and attach `dist/tab-tidy-<version>.zip` to the GitHub release (and upload it to the Chrome Web Store, if published there).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
