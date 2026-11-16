import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DOMAIN_GROUP_COLORS, FIRST_UNPINNED_TAB, PINNED_ANCHORS } from '../src/config.js';
import {
  GROUP_COLORS,
  LIMITS,
  defaultSettings,
  mergeWithDefaults,
  validateAnchor,
  validateSettings,
} from '../src/settings.js';

const anchor = (overrides = {}) => ({
  name: 'Example', match: 'example.com', url: 'https://example.com', color: 'blue', ...overrides,
});
const firstTab = (overrides = {}) => ({
  enabled: true, name: 'Dev', match: 'localhost:3000', url: 'http://localhost:3000', ...overrides,
});

// ── defaults ────────────────────────────────────────────────────────────────

test('defaultSettings mirrors src/config.js', () => {
  const d = defaultSettings();
  assert.deepEqual(d.anchors, PINNED_ANCHORS);
  assert.deepEqual(d.domainGroupColors, DOMAIN_GROUP_COLORS);
  if (FIRST_UNPINNED_TAB) assert.deepEqual(d.firstTab, { enabled: true, ...FIRST_UNPINNED_TAB });
  else assert.equal(d.firstTab.enabled, false);
});

test('defaultSettings returns a fresh copy every time', () => {
  const a = defaultSettings();
  a.anchors[0].name = 'changed';
  a.anchors.push(anchor());
  a.firstTab.enabled = !a.firstTab.enabled;
  assert.deepEqual(defaultSettings().anchors, PINNED_ANCHORS);
  assert.notEqual(defaultSettings().firstTab.enabled, a.firstTab.enabled);
});

test('the shipped defaults pass validation', () => {
  assert.equal(validateSettings(defaultSettings()).ok, true);
});

test('GROUP_COLORS lists the 9 Chrome tab group colors', () => {
  assert.deepEqual(
    Object.keys(GROUP_COLORS),
    ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'],
  );
});

// ── validateAnchor ──────────────────────────────────────────────────────────

test('validateAnchor accepts a good anchor and cleans it up', () => {
  const { anchor: out, errors } = validateAnchor(anchor({
    name: '  Example  ', match: ' Example.COM/Docs ', url: ' https://example.com/Docs/x ',
  }));
  assert.deepEqual(errors, {});
  // Host part is lowercased (Chrome reports hosts in lowercase); path case is kept.
  assert.deepEqual(out, { name: 'Example', match: 'example.com/Docs', url: 'https://example.com/Docs/x', color: 'blue' });
});

test('validateAnchor drops unknown fields', () => {
  const { anchor: out } = validateAnchor({ ...anchor(), extra: 'x' });
  assert.deepEqual(Object.keys(out).sort(), ['color', 'match', 'name', 'url']);
});

test('validateAnchor: name is required and length-limited', () => {
  assert.ok(validateAnchor(anchor({ name: '   ' })).errors.name);
  assert.ok(validateAnchor(anchor({ name: 'x'.repeat(LIMITS.name + 1) })).errors.name);
  assert.equal(validateAnchor(anchor({ name: 'x'.repeat(LIMITS.name) })).errors.name, undefined);
});

test('validateAnchor: match must be a bare host with an optional path', () => {
  assert.ok(validateAnchor(anchor({ match: '' })).errors.match);
  assert.ok(validateAnchor(anchor({ match: 'https://example.com', url: 'https://example.com' })).errors.match);
  assert.ok(validateAnchor(anchor({ match: 'exa mple.com' })).errors.match);
  assert.ok(validateAnchor(anchor({ match: '/docs' })).errors.match);
  assert.ok(validateAnchor(anchor({ match: 'x'.repeat(LIMITS.match + 1) })).errors.match);
});

test('validateAnchor: url must be a full http(s) URL', () => {
  assert.ok(validateAnchor(anchor({ url: '' })).errors.url);
  assert.ok(validateAnchor(anchor({ url: 'example.com' })).errors.url);
  assert.ok(validateAnchor(anchor({ url: 'javascript:alert(1)' })).errors.url);
  assert.ok(validateAnchor(anchor({ url: 'chrome://settings' })).errors.url);
  assert.equal(validateAnchor(anchor({ url: 'http://example.com' })).errors.url, undefined);
});

test('validateAnchor: url must match its own pattern', () => {
  // Otherwise every cleanup would open another copy that never counts as the anchor.
  const { errors } = validateAnchor(anchor({ match: 'mail.google.com', url: 'https://gmail.com' }));
  assert.match(errors.url, /match/i);
  assert.equal(validateAnchor(anchor({ match: 'claude.ai/design', url: 'https://claude.ai/design' })).errors.url, undefined);
});

test('validateAnchor: color must be a Chrome group color', () => {
  assert.ok(validateAnchor(anchor({ color: 'magenta' })).errors.color);
  assert.ok(validateAnchor(anchor({ color: undefined })).errors.color);
  for (const color of Object.keys(GROUP_COLORS)) {
    assert.equal(validateAnchor(anchor({ color })).errors.color, undefined);
  }
});

test('validateAnchor tolerates non-string input without throwing', () => {
  const { errors } = validateAnchor({ name: 5, match: null, url: {}, color: [] });
  assert.ok(errors.name && errors.match && errors.url && errors.color);
  assert.ok(validateAnchor(null).errors.name);
});

// ── validateSettings ────────────────────────────────────────────────────────

test('validateSettings: ok result carries cleaned settings', () => {
  const result = validateSettings({ anchors: [anchor({ name: ' A ' })], firstTab: firstTab() });
  assert.equal(result.ok, true);
  assert.equal(result.settings.anchors[0].name, 'A');
  assert.deepEqual(result.settings.firstTab, firstTab());
});

test('validateSettings: an empty anchor list is allowed', () => {
  assert.equal(validateSettings({ anchors: [], firstTab: firstTab({ enabled: false }) }).ok, true);
});

test('validateSettings: errors are reported per anchor row', () => {
  const result = validateSettings({ anchors: [anchor(), anchor({ match: 'other.com', name: '' })], firstTab: firstTab() });
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors.anchors[0], {});
  assert.ok(result.errors.anchors[1].name);
});

test('validateSettings: two anchors cannot share a pattern', () => {
  const result = validateSettings({
    anchors: [anchor(), anchor({ name: 'Again', match: 'EXAMPLE.com' })],
    firstTab: firstTab(),
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors.anchors[0], {});
  assert.match(result.errors.anchors[1].match, /already/i);
});

test('validateSettings: anchor count is limited', () => {
  const anchors = Array.from({ length: LIMITS.anchors + 1 }, (_, i) =>
    anchor({ name: `A${i}`, match: `a${i}.com`, url: `https://a${i}.com` }));
  const result = validateSettings({ anchors, firstTab: firstTab() });
  assert.equal(result.ok, false);
  assert.ok(result.errors.form.length > 0);
});

test('validateSettings: rejects settings too big for chrome.storage.sync', () => {
  const anchors = Array.from({ length: 20 }, (_, i) =>
    anchor({ name: `A${i}`, match: `a${i}.com`, url: `https://a${i}.com/${'x'.repeat(400)}` }));
  const result = validateSettings({ anchors, firstTab: firstTab() });
  assert.equal(result.ok, false);
  assert.match(result.errors.form.join(' '), /too much|shorten/i);
});

test('validateSettings: a disabled first tab is not validated but is kept', () => {
  const result = validateSettings({ anchors: [], firstTab: { enabled: false, name: '', match: 'x y', url: 'nope' } });
  assert.equal(result.ok, true);
  assert.deepEqual(result.settings.firstTab, { enabled: false, name: '', match: 'x y', url: 'nope' });
});

test('validateSettings: an enabled first tab is validated', () => {
  const result = validateSettings({ anchors: [], firstTab: firstTab({ url: 'localhost:3000' }) });
  assert.equal(result.ok, false);
  assert.ok(result.errors.firstTab.url);
});

test('validateSettings: first tab url must contain its match', () => {
  const result = validateSettings({ anchors: [], firstTab: firstTab({ url: 'http://localhost:5173' }) });
  assert.equal(result.ok, false);
  assert.match(result.errors.firstTab.url, /match/i);
});

test('validateSettings: first tab cannot also be an anchor', () => {
  const result = validateSettings({
    anchors: [anchor({ match: 'localhost:3000', url: 'http://localhost:3000' })],
    firstTab: firstTab(),
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.firstTab.url, /anchor/i);
});

test('validateSettings: missing or malformed input does not throw', () => {
  for (const input of [undefined, null, {}, { anchors: 'x', firstTab: 5 }]) {
    const result = validateSettings(input);
    assert.equal(typeof result.ok, 'boolean');
  }
});

// ── mergeWithDefaults ───────────────────────────────────────────────────────

test('mergeWithDefaults: nothing stored → defaults', () => {
  assert.deepEqual(mergeWithDefaults({}, defaultSettings()), defaultSettings());
  assert.deepEqual(mergeWithDefaults(undefined, defaultSettings()), defaultSettings());
});

test('mergeWithDefaults: stored values replace defaults key by key', () => {
  const stored = { anchors: [anchor()] };
  const merged = mergeWithDefaults(stored, defaultSettings());
  assert.deepEqual(merged.anchors, [anchor()]);
  assert.deepEqual(merged.firstTab, defaultSettings().firstTab);
  assert.deepEqual(merged.domainGroupColors, defaultSettings().domainGroupColors);
});

test('mergeWithDefaults: stored empty anchor list is respected', () => {
  assert.deepEqual(mergeWithDefaults({ anchors: [] }, defaultSettings()).anchors, []);
});

test('mergeWithDefaults: a stored disabled first tab is respected', () => {
  const merged = mergeWithDefaults({ firstTab: firstTab({ enabled: false }) }, defaultSettings());
  assert.equal(merged.firstTab.enabled, false);
});

test('mergeWithDefaults: invalid stored values fall back to the defaults', () => {
  const d = defaultSettings();
  const merged = mergeWithDefaults({
    anchors: [anchor(), anchor({ color: 'magenta' })],
    firstTab: { enabled: true, name: '', match: '', url: '' },
    domainGroupColors: ['cyan', 'not-a-color'],
  }, d);
  assert.deepEqual(merged, d);
});

test('mergeWithDefaults: wrong types fall back to the defaults', () => {
  const d = defaultSettings();
  assert.deepEqual(mergeWithDefaults({ anchors: 'x', firstTab: 5, domainGroupColors: {} }, d), d);
  assert.deepEqual(mergeWithDefaults({ domainGroupColors: [] }, d).domainGroupColors, d.domainGroupColors);
});

test('mergeWithDefaults: valid stored group colors are used', () => {
  const merged = mergeWithDefaults({ domainGroupColors: ['red', 'blue'] }, defaultSettings());
  assert.deepEqual(merged.domainGroupColors, ['red', 'blue']);
});

test('mergeWithDefaults: unknown stored keys are ignored', () => {
  const merged = mergeWithDefaults({ somethingElse: 1 }, defaultSettings());
  assert.deepEqual(Object.keys(merged).sort(), ['anchors', 'domainGroupColors', 'firstTab']);
});
