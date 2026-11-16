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
| `src/config.js` | Default settings: anchors, first tab, group colors. Users change their own on the options page. |
| `src/settings.js` | Settings defaults, validation and merging with stored values. Pure, has unit tests. |
| `src/background/tidy.js` | The cleanup, one numbered step at a time. Start reading here. |
| `src/background/matching.js` | Pure URL logic with no `chrome.*` calls. Has unit tests. |
| `src/background/tabs.js` | Small wrappers around `chrome.tabs` / `chrome.windows`. |
| `src/background/storage.js` | Loads and saves settings in `chrome.storage.sync`. |
| `src/background/grouping.js` | Per-domain tab groups. |
| `src/background/preview.js` | Read-only summary shown when the popup opens. |
| `src/background/index.js` | Service worker entry point and message handler. |
| `src/popup/` | Popup HTML, CSS and JS. |
| `src/options/` | Options page HTML, CSS and JS. |
| `test/` | Unit tests, run with Node's built-in test runner. |
| `scripts/` | Manifest check and release packaging. |

The popup and service worker talk through `chrome.runtime.sendMessage` with two actions, `preview` and `tidy` (see `src/background/index.js`). The options page saves settings to `chrome.storage.sync`, and the service worker reads them again for every preview and cleanup.

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
- [ ] If you touched settings or the options page: change, reorder and remove anchors there, save, and check that the next cleanup follows them. Also try it with the first unpinned tab turned off.

## Guidelines

- **Keep it dependency-free at runtime.** No frameworks, no bundler, no build step. `src/` must stay loadable as-is.
- **Put new pure logic in `matching.js`** (or a new module without `chrome.*` calls) and add tests for it in `test/`.
- **Be careful with permissions.** Adding a permission changes the install warning for every user. Explain why in the PR.
- **Never use `innerHTML` with tab data.** Page titles and URLs come from websites. Build DOM nodes and set `textContent` (see `el()` in `popup.js`).
- **Keep your personal config out of PRs.** Use the options page for your own setup. Only change `src/config.js` when the PR is about the defaults, and keep them neutral: new installs start with no anchors and the first unpinned tab off, so a first cleanup never opens or closes sites the user didn't pick. A test in `test/settings.test.js` checks this.
- **Small, focused PRs** are much easier to review than large ones.
- **Update [CHANGELOG.md](CHANGELOG.md)** under *Unreleased* for any user-visible change.

Code style is enforced by ESLint and [`.editorconfig`](.editorconfig): 2-space indentation, ES modules, `const` by default. Vertically aligning related lines is welcome where it helps readability.

## Commit messages

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). Pull request titles use the same format.

```
<type>(<scope>): <summary>

<body>

<footer>
```

**Type** says what kind of change it is:

| Type       | Use it for |
| ---------- | ---------- |
| `feat`     | A new feature users can see. |
| `fix`      | A bug fix users can notice. |
| `docs`     | Documentation only: README, CONTRIBUTING, CHANGELOG, comments. |
| `refactor` | Code changes that don't change behavior. |
| `test`     | Adding or fixing tests only. |
| `ci`       | GitHub Actions workflows and Dependabot. |
| `build`    | Packaging, npm scripts and dev dependencies. |
| `chore`    | Other housekeeping, such as `.gitignore`, issue templates or a release commit. |

**Scope** is optional and names the area you touched: `background`, `popup`, `options`, `settings`, `manifest`, `readme`, `contributing`, `deps` or `release`. Leave it out when a change spans several areas.

**Summary** rules:

- Imperative mood: "add", not "added" or "adds".
- Lowercase first letter, no full stop at the end.
- Keep the whole first line within 72 characters.

**Body** is optional for small changes and expected for anything bigger. Leave a blank line after the summary and wrap lines at 72 characters. Explain why the change is needed and what users will notice; the diff already shows what changed line by line.

**Footer** holds trailers such as `Fixes #12` or `Co-authored-by: Name <email>`.

**Breaking changes** get a `!` after the type or scope plus a `BREAKING CHANGE:` footer. For Tab Tidy that means things like dropping a permission users rely on or a settings change that loses saved settings.

Keep one logical change per commit. Commits typed `feat` or `fix`, or marked with `!`, almost always need a line in [CHANGELOG.md](CHANGELOG.md) too.

Examples:

```
feat(options): add options page for anchors and first unpinned tab
fix(popup): show the "No windows found" message
docs(readme): document the storage permission
refactor(background): split tidy steps into helpers
ci: run the manifest check on pull requests
build(deps-dev): bump eslint from 10.15.0 to 10.16.0
chore(release): v0.1.0
```

## Releasing (maintainers)

1. Bump `version` in `src/manifest.json`.
2. Move the *Unreleased* entries in `CHANGELOG.md` under the new version.
3. Commit as `chore(release): v0.1.0`, then tag: `git tag v0.1.0 && git push --tags`.
4. Run `npm run package` and attach `dist/tab-tidy-<version>.zip` to the GitHub release (and upload it to the Chrome Web Store, if published there).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
