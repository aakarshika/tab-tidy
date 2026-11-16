import { anchorIndexFor } from './matching.js';
import { loadSettings } from './storage.js';
import { getAllData } from './tabs.js';

/** Read-only snapshot shown when the popup opens. Changes nothing. */
export async function previewTabs() {
  const { anchors } = await loadSettings();
  const { windows, allTabs } = await getAllData();
  const anchorsFound = anchors.map((a, i) => {
    const matches = allTabs.filter(t => anchorIndexFor(t.url, anchors) === i);
    return {
      name:     a.name,
      color:    a.color,
      pinned:   matches.filter(t =>  t.pinned).length,
      unpinned: matches.filter(t => !t.pinned).length,
    };
  });
  return {
    windowCount: windows.length,
    tabCount:    allTabs.length,
    pinnedCount: allTabs.filter(t => t.pinned).length,
    anchorsFound,
  };
}
