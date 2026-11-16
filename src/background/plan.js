// Pure decisions for a cleanup: which tabs to pin, unpin, close and group.
// No `chrome.*` calls, so it's unit tested with plain Node (test/plan.test.js);
// tidy.js and grouping.js carry the decisions out.
//
// Safety rule: nothing here may cost the user work. The only tabs ever closed
// are exact duplicates (same URL as a tab that stays open), and existing tab
// groups are never dissolved.
//
// Tabs are plain objects { id, url, pinned, groupId }, in window order.

import { anchorIndexFor, getRootDomain, isInternalUrl } from './matching.js';

const NO_GROUP = -1; // chrome.tabGroups.TAB_GROUP_ID_NONE
const isGrouped = t => t.groupId != null && t.groupId !== NO_GROUP;

/**
 * The copy of an anchor site you used most recently (Chrome's `lastAccessed`).
 * On a tie, or when Chrome doesn't report it, the existing pin wins, so
 * running cleanups back to back never swaps the pin between two copies.
 */
function pickKeeper(matches) {
  let best = null;
  for (const t of matches) {
    const used = t.lastAccessed ?? -Infinity, bestUsed = best?.lastAccessed ?? -Infinity;
    if (!best || used > bestUsed || (used === bestUsed && t.pinned && !best.pinned)) best = t;
  }
  return best;
}

/**
 * Picks one tab per anchor to pin: the copy you used most recently (see
 * pickKeeper). Other pins of that site are unpinned and every other tab
 * from the site is left open.
 *
 * Returns {
 *   pin:     Set of tab ids to pin,
 *   unpin:   Set of tab ids to unpin (older pins of an anchor site),
 *   missing: anchor indexes with no tab at all,
 *   notes:   per anchor { index, kind: 'promoted' | 'kept' | 'missing', extraPins, extraTabs },
 * }
 */
export function planAnchors(tabs, anchors) {
  const pin = new Set(), unpin = new Set(), missing = [], notes = [];
  const byAnchor = anchors.map(() => []);
  for (const t of tabs) {
    const i = anchorIndexFor(t.url, anchors);
    if (i !== -1) byAnchor[i].push(t);
  }

  byAnchor.forEach((matches, index) => {
    const pinned   = matches.filter(t =>  t.pinned);
    const unpinned = matches.filter(t => !t.pinned);
    const keeper   = pickKeeper(matches);
    if (!keeper) {
      missing.push(index);
      notes.push({ index, kind: 'missing', extraPins: 0, extraTabs: 0 });
      return;
    }
    pin.add(keeper.id);
    const extraPins = pinned.filter(t => t !== keeper);
    extraPins.forEach(t => unpin.add(t.id));
    notes.push({
      index,
      kind:      keeper.pinned ? 'kept' : 'promoted',
      extraPins: extraPins.length,
      extraTabs: unpinned.filter(t => t !== keeper).length,
    });
  });

  return { pin, unpin, missing, notes };
}

/**
 * Exact-URL duplicates to close, keeping the first copy. Tabs about to be
 * pinned always stay; the user's own pins (pinned tabs that aren't being
 * unpinned) are never touched.
 */
export function planDuplicates(tabs, { pin, unpin }) {
  const seen  = new Set(tabs.filter(t => pin.has(t.id)).map(t => t.url));
  const close = new Set();
  for (const t of tabs) {
    if (pin.has(t.id)) continue;
    if (t.pinned && !unpin.has(t.id)) continue;
    const key = t.url || `tab:${t.id}`;
    if (seen.has(key)) close.add(t.id);
    else seen.add(key);
  }
  return close;
}

/**
 * Groups loose (ungrouped) tabs by website without touching existing groups.
 * A loose tab joins an existing group titled with its root domain (one Tab
 * Tidy made in an earlier cleanup); otherwise 2+ loose tabs of one site get a
 * new group. Browser pages and tabs in `skip` are never grouped.
 *
 * `tabs` are the window's unpinned tabs, `groups` its groups [{ id, title }].
 * Returns { extend: [{ groupId, domain, tabIds }], create: [{ domain, tabIds }] }.
 */
export function planGrouping(tabs, groups, skip = new Set()) {
  const groupByTitle = new Map();
  for (const g of groups) if (g.title && !groupByTitle.has(g.title)) groupByTitle.set(g.title, g.id);

  const loose = new Map(); // domain → tab ids
  for (const t of tabs) {
    if (isGrouped(t) || skip.has(t.id) || isInternalUrl(t.url)) continue;
    const domain = getRootDomain(t.url);
    if (!loose.has(domain)) loose.set(domain, []);
    loose.get(domain).push(t.id);
  }

  const extend = [], create = [];
  for (const [domain, tabIds] of loose) {
    if (groupByTitle.has(domain)) extend.push({ groupId: groupByTitle.get(domain), domain, tabIds });
    else if (tabIds.length >= 2)  create.push({ domain, tabIds });
  }
  return { extend, create };
}
