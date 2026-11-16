# Chrome Web Store listing

Everything needed to publish Tab Tidy on the [Chrome Web Store](https://chromewebstore.google.com/), ready to paste into the [Developer Dashboard](https://chrome.google.com/webstore/devconsole). Keep this file in sync with the dashboard: when a permission or feature changes, update the matching section here (and [PRIVACY.md](PRIVACY.md)) in the same pull request.

Checked against the Web Store docs on 2026-11-15: [images](https://developer.chrome.com/docs/webstore/images), [listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing), [privacy tab](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy) and the [user data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).

## Submission checklist

1. **Register** at the [Developer Dashboard](https://chrome.google.com/webstore/devconsole): accept the developer agreement, pay the one-time registration fee, set a **publisher name** and **verify your contact email** (both required). The account email can't be changed later.
2. **Build the package:** `npm run package`, then upload `dist/tab-tidy-<version>.zip` (or the zip attached to the GitHub release you're submitting).
3. **Store listing tab:** fill in the [text](#store-listing) and upload the [images](#images).
4. **Privacy tab:** paste the [privacy answers](#privacy-practices).
5. **Distribution tab:** free, public, all regions.
6. **Submit for review.**

## Store listing

| Field | Value |
| ----- | ----- |
| Name | Tab Tidy _(from `manifest.json`)_ |
| Summary | One click to merge windows, close duplicate tabs, keep your favorite sites pinned in order and group tabs by domain. _(from the manifest `description`, max 132 characters)_ |
| Category | **Functionality & UI** _(the store's category for tab managers)_ |
| Language | English |
| Homepage URL | https://github.com/aakarshika/tab-tidy |
| Support URL | https://github.com/aakarshika/tab-tidy/issues |
| Mature content | No |

### Description

Paste as plain text:

```text
Tab Tidy cleans up tab chaos in one click.

Too many windows, the same page open three times, the sites you use every day scattered everywhere? Open Tab Tidy, press Run cleanup, and get one tidy window:

• Merges all your windows into one
• Closes duplicate tabs (tabs with exactly the same address)
• Keeps the sites you always use pinned, in your order, and reopens any that are missing
• Groups the rest of your tabs by website, each in its own colored tab group
• Optionally keeps one tab, such as a local dev server, right after your pinned tabs

Pick your pinned sites on the Settings page: add, reorder and color them. If one of them is open in more than one tab, Tab Tidy keeps the tab you were using and closes the extra copies. Settings sync to your other computers through Chrome.

Safe by default: a new install has no pinned sites, so your first cleanup never opens or closes a site you didn't choose. The popup shows your windows, tabs and pinned sites before you run a cleanup, and a log of everything that changed afterwards. Closed a tab you wanted? Ctrl+Shift+T (Cmd+Shift+T on Mac) brings it back.

Private by design: Tab Tidy runs entirely in your browser. No accounts, no analytics, no network requests, no data collection. It uses only three permissions: tabs, tab groups and storage.

Free and open source (MIT): https://github.com/aakarshika/tab-tidy
```

## Images

All files are in [`store/`](store/). Screenshots are 1280×800 and full-bleed, as the store requires.

| Slot | File | Required |
| ---- | ---- | -------- |
| Store icon (128×128, 96×96 artwork with 16 px transparent padding) | `store/icon-128.png` | Yes |
| Screenshot 1: the popup after a cleanup | `store/screenshot-1-cleanup.png` | At least one |
| Screenshot 2: before and after | `store/screenshot-2-before-after.png` | |
| Screenshot 3: the Settings page | `store/screenshot-3-settings.png` | |
| Small promo tile (440×280) | `store/promo-small-440x280.png` | No |
| Marquee promo tile (1400×560) | `store/promo-marquee-1400x560.png` | No |

The screenshots use example sites (GitHub, Notion, Figma, Linear) rather than Google products, to stay clear of Google's brand rules for store images. If the popup or Settings page changes visibly, retake them.

## Privacy practices

### Single purpose

```text
Tab Tidy organizes the user's open tabs and windows. When the user runs a cleanup, it merges windows into one, closes duplicate tabs, keeps the sites the user chose pinned in order, and groups the remaining tabs by website.
```

### Permission justifications

**`tabs`**

```text
Tab Tidy reads the URL of each open tab to find duplicate tabs, recognize the sites the user chose to keep pinned, and group tabs by website. URLs are processed on the user's device only when the user opens the popup or runs a cleanup. They are never stored or transmitted.
```

**`tabGroups`**

```text
Used to create, name and color one tab group per website when the user runs a cleanup, and to clear the existing groups in that window first so every cleanup starts from a clean slate.
```

**`storage`**

```text
Saves the user's settings (their list of pinned sites and the optional "first tab" setting) with chrome.storage.sync so they persist and sync across the user's computers. No browsing data is stored.
```

### Remote code

**No, I am not using remote code.** All code ships in the package. There are no remote scripts, `eval`, or WebAssembly.

### Data usage

Google requires disclosing data an extension handles _even when it's processed only on the device_ ([user data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), question 3). Tab Tidy reads the URLs of open tabs, which falls under browsing activity, so:

- **Tick:** Web history
- **Leave unticked:** everything else (personally identifiable information, health, financial and payment, authentication, personal communications, location, user activity, website content)

Tick all three certifications:

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

### Privacy policy URL

```text
https://github.com/aakarshika/tab-tidy/blob/main/PRIVACY.md
```

## Distribution

| Field | Value |
| ----- | ----- |
| Payments | Free |
| Visibility | Public _(or Unlisted first, to try the store install yourself before anyone can find it)_ |
| Regions | All regions |
