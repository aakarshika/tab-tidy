// Service worker entry point. The popup talks to us with two messages:
//   { action: 'preview' } → read-only counts for the popup header
//   { action: 'tidy' }    → run the full cleanup and return a log

import { previewTabs } from './preview.js';
import { tidyTabs } from './tidy.js';

// New installs start with no anchors, so open the settings page once to let
// people pick their own. Updates and browser restarts don't trigger this.
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'tidy') {
    tidyTabs()
      .then(r  => sendResponse(r))
      .catch(e => sendResponse({ success: false, log: [{ icon: '!', color: 'red', text: e.message }], groups: [] }));
    return true; // keep the channel open for the async response
  }
  if (msg.action === 'preview') {
    previewTabs()
      .then(r  => sendResponse(r))
      .catch(() => sendResponse({ success: false }));
    return true;
  }
});
