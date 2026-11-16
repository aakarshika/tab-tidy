import { planGrouping } from './plan.js';

/**
 * Groups the loose (ungrouped, unpinned) tabs of a window by website, without
 * touching existing groups. See planGrouping in plan.js for the rules.
 * `colors` (Chrome color tokens) are cycled through for new groups, and tabs
 * in `skip` are left alone.
 *
 * Returns { created: [{ domain, count, color }], added } where `added` is the
 * number of tabs that joined groups from earlier cleanups.
 */
export async function groupTabsByDomain(windowId, colors, skip = new Set()) {
  const tabs   = await chrome.tabs.query({ windowId, pinned: false });
  const groups = await chrome.tabGroups.query({ windowId });
  const { extend, create } = planGrouping(tabs, groups, skip);

  let added = 0;
  for (const { groupId, tabIds } of extend) {
    try {
      await chrome.tabs.group({ groupId, tabIds });
      added += tabIds.length;
    } catch {
      // The group or a tab disappeared mid-run; leave these tabs loose.
    }
  }

  const created = [];
  let colorIdx = 0;
  for (const { domain, tabIds } of create) {
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

  return { created, added };
}
