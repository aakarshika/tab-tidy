# Privacy Policy

_Last updated: November 15, 2026_

Tab Tidy is a browser extension that tidies your tabs and windows. It was built so that nothing about your browsing ever leaves your browser. This policy explains exactly what it touches.

## What Tab Tidy reads

To do its job, Tab Tidy reads the **web addresses (URLs) of your open tabs** and which window each tab is in. It uses them only to:

- find duplicate tabs,
- recognize the sites you've chosen to keep pinned,
- group tabs by website.

This happens on your device, only when you open the Tab Tidy popup or run a cleanup. Tab Tidy does not read page contents, form data, passwords, cookies or your browsing history, and it does not record or keep the URLs it reads.

## What Tab Tidy stores

Tab Tidy saves **your settings**: the list of sites you want pinned (their names, web addresses and colors) and your "first tab" preference. They're kept in Chrome's extension storage (`chrome.storage.sync`). If you've turned on Chrome sync, Chrome copies them to your Google Account so they follow you to your other computers. That syncing is done by Chrome, under [Google's Privacy Policy](https://policies.google.com/privacy). The developer of Tab Tidy can't see or access it.

You can delete your settings at any time with **Reset to defaults** on the Settings page, or by removing the extension.

## What Tab Tidy never does

- It makes **no network requests** of its own and has no servers.
- It **collects nothing**: no analytics, tracking, crash reports, ads or accounts.
- It **doesn't sell, share or transfer** any data to anyone, including the developer.
- It doesn't use data for any purpose other than tidying your tabs, and never to determine creditworthiness or for lending.
- It doesn't run remote code. Everything it runs ships inside the extension and is open source.

When Tab Tidy opens one of your pinned sites, your browser loads that site like any other tab, and that site's own privacy policy applies.

## Permissions

| Permission  | Why Tab Tidy needs it |
| ----------- | --------------------- |
| `tabs`      | To read the URLs of open tabs, so it can find duplicates, match your pinned sites and group tabs by website. |
| `tabGroups` | To create, name and color the per-website tab groups. |
| `storage`   | To save your settings. |

## Open source

Tab Tidy's full source code is public at [github.com/aakarshika/tab-tidy](https://github.com/aakarshika/tab-tidy), so anyone can check these claims.

## Changes and contact

Changes to this policy will be published in this file, and its full history is visible on GitHub. Questions? [Open an issue](https://github.com/aakarshika/tab-tidy/issues).
