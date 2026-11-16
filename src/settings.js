// Settings rules shared by the options page and the service worker: the
// defaults, input validation, and merging stored settings over the defaults.
//
// Pure logic: no `chrome.*` calls, so it can be unit tested with plain Node
// (see test/settings.test.js). Reading and writing chrome.storage lives in
// background/storage.js.
//
// Settings shape:
//   anchors            [{ name, match, url, color }] in pinned order
//   firstTab           { enabled, name, match, url }
//   domainGroupColors  ['cyan', …] cycled through for per-domain groups
//                      (not editable in the options page yet)

import { DOMAIN_GROUP_COLORS, FIRST_UNPINNED_TAB, PINNED_ANCHORS } from './config.js';
import { anchorIndexFor, matchesAnchor } from './background/matching.js';

/** Chrome's tab group colors, in Chrome's own order, with a CSS color for display. */
export const GROUP_COLORS = Object.freeze({
  grey:   '#9e9e9e',
  blue:   '#1e88e5',
  red:    '#e53935',
  yellow: '#f9a825',
  green:  '#43a047',
  pink:   '#e91e63',
  purple: '#8e24aa',
  cyan:   '#00acc1',
  orange: '#fb8c00',
});

/** Maximum number of anchors and maximum field lengths, in characters. */
export const LIMITS = Object.freeze({ anchors: 30, name: 40, match: 200, url: 500 });

// chrome.storage.sync.QUOTA_BYTES_PER_ITEM: each top-level key is measured as
// the key plus its JSON-encoded value.
const SYNC_BYTES_PER_ITEM = 8192;

/** The settings used until the user saves their own (from src/config.js). */
export function defaultSettings() {
  return {
    anchors: PINNED_ANCHORS.map(({ name, match, url, color }) => ({ name, match, url, color })),
    firstTab: FIRST_UNPINNED_TAB
      ? { enabled: true, name: FIRST_UNPINNED_TAB.name, match: FIRST_UNPINNED_TAB.match, url: FIRST_UNPINNED_TAB.url }
      : { enabled: false, name: '', match: '', url: '' },
    domainGroupColors: [...DOMAIN_GROUP_COLORS],
  };
}

// ── Field rules ──────────────────────────────────────────────────────────────

const str      = v => (typeof v === 'string' ? v.trim() : '');
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isColor  = v => typeof v === 'string' && Object.hasOwn(GROUP_COLORS, v);

/** Lowercases the host part of a match pattern. Chrome reports hosts in lowercase. */
function cleanMatch(raw) {
  const s     = str(raw);
  const slash = s.indexOf('/');
  return slash === -1 ? s.toLowerCase() : s.slice(0, slash).toLowerCase() + s.slice(slash);
}

function nameError(name) {
  if (!name) return 'Enter a name.';
  if (name.length > LIMITS.name) return `Keep the name under ${LIMITS.name} characters.`;
}

function matchError(match) {
  if (!match) return 'Enter a site, like mail.google.com.';
  if (match.length > LIMITS.match) return `Keep this under ${LIMITS.match} characters.`;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(match)) return 'Leave out http:// or https://, e.g. mail.google.com.';
  if (/\s/.test(match)) return 'Remove the spaces.';
  const slash = match.indexOf('/');
  const host  = slash === -1 ? match : match.slice(0, slash);
  if (!/^[a-z0-9.-]+(:\d{1,5})?$/.test(host)) {
    return 'Use a host with an optional path, like mail.google.com or claude.ai/design.';
  }
}

/** Parses an http(s) URL, or returns null. */
function parseWebUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed : null;
  } catch {
    return null;
  }
}

function urlFormatError(url) {
  if (!url) return 'Enter the page to open, like https://mail.google.com.';
  if (url.length > LIMITS.url) return `Keep the URL under ${LIMITS.url} characters.`;
  if (!parseWebUrl(url)) return 'Use a full address starting with https:// or http://.';
}

/** Drops empty entries so `{}` means "no errors". */
function compact(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, msg]) => msg));
}

/**
 * Cleans up one anchor (trims fields, lowercases the host) and checks it on
 * its own. Returns { anchor, errors } where errors maps field → message.
 */
export function validateAnchor(input) {
  const src    = isObject(input) ? input : {};
  const anchor = {
    name:  str(src.name),
    match: cleanMatch(src.match),
    url:   str(src.url),
    color: isColor(src.color) ? src.color : str(src.color),
  };
  const errors = {
    name:  nameError(anchor.name),
    match: matchError(anchor.match),
    url:   urlFormatError(anchor.url),
    color: isColor(anchor.color) ? undefined : "Pick one of Chrome's tab group colors.",
  };
  // An anchor whose URL doesn't fit its own pattern would be re-opened on
  // every cleanup, because the tab it opens never counts as the anchor.
  if (!errors.match && !errors.url && !matchesAnchor(anchor.url, anchor.match)) {
    errors.url = "This URL doesn't fit the Match pattern, so the tab it opens would never count as this anchor.";
  }
  return { anchor, errors: compact(errors) };
}

function checkAnchors(input) {
  const list    = Array.isArray(input) ? input : [];
  const checked = list.map(validateAnchor);
  const anchors = checked.map(c => c.anchor);
  const errors  = checked.map(c => c.errors);
  const form    = [];

  // Equal patterns: the first one always wins, so the second would be
  // "missing" and re-opened on every cleanup.
  const seen = new Set();
  anchors.forEach((a, i) => {
    if (errors[i].match) return;
    if (seen.has(a.match)) errors[i].match = 'Another anchor already uses this pattern.';
    seen.add(a.match);
  });

  if (anchors.length > LIMITS.anchors) form.push(`You can have up to ${LIMITS.anchors} anchors.`);
  return { anchors, errors, form };
}

function checkFirstTab(input, anchors) {
  const src      = isObject(input) ? input : {};
  const enabled  = src.enabled === true;
  const firstTab = { enabled, name: str(src.name), match: cleanMatch(src.match), url: str(src.url) };
  // While it's off, half-finished values are kept (unchecked) for later.
  if (!enabled) return { firstTab, errors: {} };

  const errors = {
    name:  nameError(firstTab.name),
    match: matchError(firstTab.match),
    url:   urlFormatError(firstTab.url),
  };
  if (!errors.match && !errors.url) {
    // Mirrors step 8 of tidy.js, which finds this tab by substring of its
    // (normalized) URL.
    if (!parseWebUrl(firstTab.url).href.includes(firstTab.match)) {
      errors.url = "This URL doesn't contain the Match text, so the tab it opens would never be recognized.";
    } else if (anchorIndexFor(firstTab.url, anchors) !== -1) {
      errors.url = 'An anchor already matches this URL, so this tab would get pinned instead.';
    }
  }
  return { firstTab, errors: compact(errors) };
}

function syncItemBytes(key, value) {
  return new TextEncoder().encode(key + JSON.stringify(value)).length;
}

/**
 * Validates everything the options page edits. Returns
 *   { ok, settings: { anchors, firstTab }, errors: { anchors: [{field: msg}], firstTab: {field: msg}, form: [msg] } }
 * `settings` holds the cleaned-up values; only save it when `ok` is true.
 */
export function validateSettings(input) {
  const src = isObject(input) ? input : {};
  const a   = checkAnchors(src.anchors);
  const f   = checkFirstTab(src.firstTab, a.anchors.filter((_, i) => !Object.keys(a.errors[i]).length));
  const settings = { anchors: a.anchors, firstTab: f.firstTab };
  const form     = [...a.form];

  if (Object.entries(settings).some(([key, value]) => syncItemBytes(key, value) > SYNC_BYTES_PER_ITEM)) {
    form.push("That's too much to save. Shorten some URLs or remove an anchor.");
  }

  const ok = !form.length
    && a.errors.every(e => !Object.keys(e).length)
    && !Object.keys(f.errors).length;
  return { ok, settings, errors: { anchors: a.errors, firstTab: f.errors, form } };
}

/**
 * Combines what chrome.storage.sync returned with the defaults. Each key
 * falls back to its default when it's missing or fails validation (for
 * example after a manual edit or a schema change), so a cleanup always runs
 * with a complete, valid configuration.
 */
export function mergeWithDefaults(stored, defaults) {
  const src    = isObject(stored) ? stored : {};
  const merged = structuredClone(defaults);

  if (Array.isArray(src.anchors)) {
    const a = checkAnchors(src.anchors);
    if (!a.form.length && a.errors.every(e => !Object.keys(e).length)) merged.anchors = a.anchors;
  }

  if (isObject(src.firstTab)) {
    const f = checkFirstTab(src.firstTab, merged.anchors);
    if (!Object.keys(f.errors).length) merged.firstTab = f.firstTab;
  }

  const colors = src.domainGroupColors;
  if (Array.isArray(colors) && colors.length && colors.every(isColor)) {
    merged.domainGroupColors = [...colors];
  }

  return merged;
}
