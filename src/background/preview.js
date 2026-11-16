import { PINNED_ANCHORS } from '../config.js';
import { anchorIndexFor } from './matching.js';
import { getAllData } from './tabs.js';

/** Read-only snapshot shown when the popup opens. Changes nothing. */
export async function previewTabs() {
  const { windows, allTabs } = await getAllData();
  const anchorsFound = PINNED_ANCHORS.map((a, i) => {
    const matches = allTabs.filter(t => anchorIndexFor(t.url, PINNED_ANCHORS) === i);
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
