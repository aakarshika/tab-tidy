// Thin wrappers around the chrome.tabs / chrome.windows APIs.

/** All normal (non-popup, non-devtools) windows with their tabs. */
export async function getAllData() {
  const windows = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] });
  const allTabs = windows.flatMap(w => w.tabs);
  return { windows, allTabs };
}

/** The window everything gets merged into: the focused one, else the biggest. */
export function pickPrimary(windows) {
  return windows.find(w => w.focused)
    ?? windows.reduce((best, w) => w.tabs.length > best.tabs.length ? w : best);
}

// The "safe" variants swallow errors on purpose: a tab can be closed by the
// user (or another extension) between our query and our action, and that
// should not abort the whole cleanup.
export async function safeClose(ids)        { if (ids.length) try { await chrome.tabs.remove(ids); } catch { /* tab already gone */ } }
export async function safeMove(id, opts)    { try { await chrome.tabs.move(id, opts); } catch { /* tab already gone */ } }
export async function safeUpdate(id, props) { try { await chrome.tabs.update(id, props); } catch { /* tab already gone */ } }
export async function safeUngroup(ids)      { if (ids.length) try { await chrome.tabs.ungroup(ids); } catch { /* tab already gone */ } }

/** Moves a whole tab group, keeping it intact. Returns false if it couldn't. */
export async function safeMoveGroup(groupId, opts) {
  try { await chrome.tabGroups.move(groupId, opts); return true; } catch { return false; }
}
