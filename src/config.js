// ─────────────────────────────────────────────────────────────────────────────
// TAB TIDY DEFAULTS
//
// Users change their settings on the options page (right-click the toolbar
// icon → Options), which stores them in chrome.storage.sync. The values below
// are only used until something is saved there, and again after "Reset to
// defaults". The rules for each field are in settings.js.
// ─────────────────────────────────────────────────────────────────────────────

// Sites that should always be open as pinned tabs, in left-to-right order.
//
//   name   Label shown in the popup.
//   match  Host (and optional path prefix) that identifies the site,
//          e.g. 'mail.google.com' or 'claude.ai/design'. When several anchors
//          match a tab, the longest (most specific) match wins.
//   url    Opened when no matching tab exists.
//   color  Chrome tab group color: grey, blue, red, yellow, green, pink,
//          purple, cyan or orange. Used for the dot in the popup.
export const PINNED_ANCHORS = [
  { name: 'YouTube',       match: 'youtube.com',      url: 'https://youtube.com',      color: 'red'    },
  { name: 'ChatGPT',       match: 'chatgpt.com',      url: 'https://chatgpt.com',      color: 'green'  },
  { name: 'Claude',        match: 'claude.ai',        url: 'https://claude.ai',        color: 'orange' },
  { name: 'Claude Design', match: 'claude.ai/design', url: 'https://claude.ai/design', color: 'purple' },
  { name: 'Gmail',         match: 'mail.google.com',  url: 'https://mail.google.com',  color: 'blue'   },
  // { name: 'Notion', match: 'notion.so', url: 'https://notion.so', color: 'grey' },
];

// A tab that always sits right after the pinned tabs (handy for a local dev
// server). It is opened if missing. Set to null to turn this off by default.
export const FIRST_UNPINNED_TAB = {
  name:  'Dev Server',
  match: 'localhost:5173',
  url:   'http://localhost:5173',
};

// Colors cycled through for the per-domain tab groups (Chrome color tokens).
// Not editable on the options page yet.
export const DOMAIN_GROUP_COLORS = ['cyan', 'purple', 'pink', 'yellow', 'blue', 'green', 'red', 'orange', 'grey'];
