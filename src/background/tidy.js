import { groupTabsByDomain } from './grouping.js';
import { anchorIndexFor } from './matching.js';
import { loadSettings } from './storage.js';
import { getAllData, pickPrimary, safeClose, safeMove, safeUpdate } from './tabs.js';

/**
 * Runs the full cleanup. Returns { success, log, groups } where `log` is a
 * list of { icon, color, text } lines rendered by the popup.
 */
export async function tidyTabs() {
  const log = [];
  const { anchors, firstTab, domainGroupColors } = await loadSettings();
  const anchorIndex = url => anchorIndexFor(url, anchors);

  const { windows, allTabs } = await getAllData();
  if (!windows.length) {
    return { success: true, log: [{ icon: '!', color: 'amber', text: 'No windows found.' }], groups: [] };
  }

  const primary     = pickPrimary(windows);
  const tabsToClose = new Set();
  const tabsToPin   = new Set();
  const anchorDone  = new Set();

  // ── 1. Resolve anchors ────────────────────────────────────────────────────
  // Prefer a tab the user is actively using (unpinned) over an old pin.
  for (let i = 0; i < anchors.length; i++) {
    const anchor   = anchors[i];
    const matches  = allTabs.filter(t => anchorIndex(t.url) === i);
    const pinned   = matches.filter(t =>  t.pinned);
    const unpinned = matches.filter(t => !t.pinned);

    if (unpinned.length > 0) {
      tabsToPin.add(unpinned[0].id);
      anchorDone.add(i);
      pinned.forEach(t            => tabsToClose.add(t.id));
      unpinned.slice(1).forEach(t => tabsToClose.add(t.id));
      log.push({ icon: '↑', color: 'amber', text: `${anchor.name}: active tab → pin, ${pinned.length} old pin(s) closed` });
    } else if (pinned.length > 0) {
      tabsToPin.add(pinned[0].id);
      anchorDone.add(i);
      pinned.slice(1).forEach(t => tabsToClose.add(t.id));
      log.push({ icon: '✓', color: 'green', text: `${anchor.name}: existing pin kept` });
    } else {
      log.push({ icon: '+', color: 'blue', text: `${anchor.name}: not found, will open & pin` });
    }
  }

  // ── 2. Deduplicate unpinned tabs ──────────────────────────────────────────
  const seenUrls = new Set(
    allTabs.filter(t => tabsToPin.has(t.id)).map(t => t.url)
  );
  let dupes = 0;
  for (const tab of allTabs) {
    if (tab.pinned || tabsToClose.has(tab.id) || tabsToPin.has(tab.id)) continue;
    if (anchorIndex(tab.url) !== -1) continue;
    const key = tab.url || String(tab.id);
    if (seenUrls.has(key)) { tabsToClose.add(tab.id); dupes++; }
    else seenUrls.add(key);
  }
  if (dupes > 0) log.push({ icon: '✕', color: 'red', text: `${dupes} duplicate tab(s) removed` });

  // ── 3. Merge windows ──────────────────────────────────────────────────────
  let moved = 0;
  for (const win of windows) {
    if (win.id === primary.id) continue;
    for (const tab of win.tabs) {
      if (tabsToClose.has(tab.id)) continue;
      await safeMove(tab.id, { windowId: primary.id, index: -1 });
      moved++;
    }
  }
  if (moved > 0) log.push({ icon: '⊞', color: 'purple', text: `${moved} tab(s) merged into main window` });

  // ── 4. Close stale tabs ───────────────────────────────────────────────────
  await safeClose([...tabsToClose]);

  // ── 5. Pin the winners ────────────────────────────────────────────────────
  for (const id of tabsToPin) await safeUpdate(id, { pinned: true });

  // ── 6. Open missing anchors ───────────────────────────────────────────────
  for (let i = 0; i < anchors.length; i++) {
    if (anchorDone.has(i)) continue;
    const anchor = anchors[i];
    await chrome.tabs.create({ url: anchor.url, pinned: true, windowId: primary.id });
    log.push({ icon: '+', color: 'blue', text: `${anchor.name}: opened & pinned` });
  }

  // ── 7. Sort pinned tabs ───────────────────────────────────────────────────
  const freshPinned = await chrome.tabs.query({ windowId: primary.id, pinned: true });
  for (let i = 0; i < anchors.length; i++) {
    const tab = freshPinned.find(t => anchorIndex(t.url) === i);
    if (tab) await safeMove(tab.id, { windowId: primary.id, index: i });
  }

  // ── 8. First unpinned tab (optional) ──────────────────────────────────────
  if (firstTab.enabled) {
    const freshAll    = await chrome.tabs.query({ windowId: primary.id });
    const pinnedCount = freshAll.filter(t => t.pinned).length;
    const devTab      = freshAll.find(t => t.url && t.url.includes(firstTab.match));

    if (devTab) {
      await safeMove(devTab.id, { windowId: primary.id, index: pinnedCount });
      log.push({ icon: '⊡', color: 'teal', text: `${firstTab.name} → first unpinned slot` });
    } else {
      await chrome.tabs.create({ url: firstTab.url, windowId: primary.id, index: pinnedCount });
      log.push({ icon: '+', color: 'blue', text: `${firstTab.name}: opened as first unpinned` });
    }
  }

  // ── 9. Group unpinned tabs by domain ──────────────────────────────────────
  const groups = await groupTabsByDomain(primary.id, domainGroupColors);
  if (groups.length > 0) {
    log.push({ icon: '⬡', color: 'cyan', text: `${groups.length} domain group(s) created` });
  }

  log.push({ icon: '✔', color: 'done', text: 'Done!' });
  return { success: true, log, groups };
}
