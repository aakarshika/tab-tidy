import { getRootDomain, isInternalUrl } from './matching.js';
import { safeUngroup } from './tabs.js';

/**
 * Regroups the unpinned tabs of a window: one tab group per root domain that
 * has 2+ tabs. Existing groups are dissolved first so every run starts clean.
 * `colors` (Chrome color tokens) are cycled through, one per group.
 * Returns [{ domain, count, color }] for the groups that were created.
 */
export async function groupTabsByDomain(windowId, colors) {
  const unpinned = await chrome.tabs.query({ windowId, pinned: false });

  const grouped = unpinned.filter(t => t.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE);
  await safeUngroup(grouped.map(t => t.id));

  // domain → tab IDs
  const domainMap = new Map();
  for (const tab of unpinned) {
    if (isInternalUrl(tab.url)) continue;
    const domain = getRootDomain(tab.url);
    if (!domainMap.has(domain)) domainMap.set(domain, []);
    domainMap.get(domain).push(tab.id);
  }

  const created = [];
  let colorIdx = 0;

  for (const [domain, tabIds] of domainMap) {
    if (tabIds.length < 2) continue; // only group if 2+ tabs share a domain

    const color = colors[colorIdx % colors.length];
    try {
      const groupId = await chrome.tabs.group({ tabIds, createProperties: { windowId } });
      await chrome.tabGroups.update(groupId, { title: domain, color, collapsed: false });
      colorIdx++;
      created.push({ domain, count: tabIds.length, color });
    } catch {
      // A tab in this set disappeared mid-run; skip this group.
    }
  }

  return created;
}
