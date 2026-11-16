import { groupTabsByDomain } from './grouping.js';
import { anchorIndexFor } from './matching.js';
import { planAnchors, planDuplicates } from './plan.js';
import { loadSettings } from './storage.js';
import { getAllData, pickPrimary, safeClose, safeMove, safeMoveGroup, safeUngroup, safeUpdate } from './tabs.js';

/**
 * Runs the full cleanup. Returns { success, log, groups } where `log` is a
 * list of { icon, color, text } lines rendered by the popup.
 *
 * Safety rule (see plan.js): the only tabs ever closed are exact duplicates,
 * and tab groups the user made are never dissolved.
 */
export async function tidyTabs() {
  const log = [];
  const { anchors, firstTab, domainGroupColors } = await loadSettings();
  const anchorIndex = url => anchorIndexFor(url, anchors);

  const { windows, allTabs } = await getAllData();
  if (!windows.length) {
    return { success: true, log: [{ icon: '!', color: 'amber', text: 'No windows found.' }], groups: [] };
  }

  const primary = pickPrimary(windows);
  const NO_GROUP = chrome.tabGroups.TAB_GROUP_ID_NONE;

  // ── 1. Resolve anchors ────────────────────────────────────────────────────
  // One pin per anchor, preferring the copy you were using over an old pin.
  // Other tabs from that site stay open; older pins are unpinned, not closed.
  const anchorPlan = planAnchors(allTabs, anchors);
  for (const note of anchorPlan.notes) {
    const { name } = anchors[note.index];
    const extra = note.extraPins ? `, ${note.extraPins} older pin(s) unpinned` : '';
    if (note.kind === 'promoted')  log.push({ icon: '↑', color: 'amber', text: `${name}: active tab → pin${extra}` });
    else if (note.kind === 'kept') log.push({ icon: '✓', color: 'green', text: `${name}: existing pin kept${extra}` });
    else                           log.push({ icon: '+', color: 'blue',  text: `${name}: not found, will open & pin` });
  }

  // ── 2. Find exact duplicates ──────────────────────────────────────────────
  const tabsToClose = planDuplicates(allTabs, anchorPlan);
  if (tabsToClose.size > 0) log.push({ icon: '✕', color: 'red', text: `${tabsToClose.size} duplicate tab(s) removed` });

  // ── 3. Merge windows ──────────────────────────────────────────────────────
  // Tab groups move as a whole so they arrive intact; loose tabs follow.
  let moved = 0;
  for (const win of windows) {
    if (win.id === primary.id) continue;
    const movedGroups = new Set();
    for (const groupId of new Set(win.tabs.map(t => t.groupId).filter(id => id !== NO_GROUP))) {
      if (await safeMoveGroup(groupId, { windowId: primary.id, index: -1 })) movedGroups.add(groupId);
    }
    for (const tab of win.tabs) {
      if (tabsToClose.has(tab.id)) continue;
      if (!movedGroups.has(tab.groupId)) await safeMove(tab.id, { windowId: primary.id, index: -1 });
      moved++;
    }
  }
  if (moved > 0) log.push({ icon: '⊞', color: 'purple', text: `${moved} tab(s) merged into main window` });

  // ── 4. Close duplicates ───────────────────────────────────────────────────
  await safeClose([...tabsToClose]);

  // ── 5. Pin the anchors, unpin older pins ──────────────────────────────────
  for (const id of anchorPlan.unpin) if (!tabsToClose.has(id)) await safeUpdate(id, { pinned: false });
  for (const id of anchorPlan.pin) await safeUpdate(id, { pinned: true });

  // ── 6. Open missing anchors ───────────────────────────────────────────────
  for (const i of anchorPlan.missing) {
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
  // It stands on its own right after the pins, so it's kept out of groups.
  let firstTabId = null;
  if (firstTab.enabled) {
    const freshAll    = await chrome.tabs.query({ windowId: primary.id });
    const pinnedCount = freshAll.filter(t => t.pinned).length;
    const devTab      = freshAll.find(t => t.url && t.url.includes(firstTab.match));

    if (devTab) {
      if (devTab.groupId !== NO_GROUP) await safeUngroup([devTab.id]);
      await safeMove(devTab.id, { windowId: primary.id, index: pinnedCount });
      firstTabId = devTab.id;
      log.push({ icon: '⊡', color: 'teal', text: `${firstTab.name} → first unpinned slot` });
    } else {
      const created = await chrome.tabs.create({ url: firstTab.url, windowId: primary.id, index: pinnedCount });
      firstTabId = created.id;
      log.push({ icon: '+', color: 'blue', text: `${firstTab.name}: opened as first unpinned` });
    }
  }

  // ── 9. Group loose tabs by domain ─────────────────────────────────────────
  // Existing groups are left exactly as they are.
  const { created, added } = await groupTabsByDomain(primary.id, domainGroupColors, new Set([firstTabId]));
  if (created.length > 0) log.push({ icon: '⬡', color: 'cyan', text: `${created.length} domain group(s) created` });
  if (added > 0)          log.push({ icon: '⬡', color: 'cyan', text: `${added} tab(s) added to existing groups` });

  log.push({ icon: '✔', color: 'done', text: 'Done!' });
  return { success: true, log, groups: created };
}
