import { test } from 'node:test';
import assert from 'node:assert/strict';

import { planAnchors, planDuplicates, planGrouping } from '../src/background/plan.js';

const NONE = -1; // chrome.tabGroups.TAB_GROUP_ID_NONE
const tab = (id, url, extra = {}) => ({ id, url, pinned: false, groupId: NONE, ...extra });
const ANCHORS = [
  { name: 'GitHub', match: 'github.com' },
  { name: 'Mail',   match: 'mail.example.com' },
];

// ── planAnchors ─────────────────────────────────────────────────────────────

test('planAnchors: the tab you were using becomes the pin', () => {
  const tabs = [tab(1, 'https://github.com/a'), tab(2, 'https://mail.example.com/', { pinned: true })];
  const plan = planAnchors(tabs, ANCHORS);
  assert.deepEqual([...plan.pin], [1, 2]);
  assert.deepEqual([...plan.unpin], []);
  assert.deepEqual(plan.missing, []);
});

test('planAnchors: other tabs from an anchor site stay open (never closed)', () => {
  const tabs = [
    tab(1, 'https://github.com/acme/app'),
    tab(2, 'https://github.com/acme/app/pull/12'),
    tab(3, 'https://github.com/acme/app/issues/3'),
  ];
  const plan = planAnchors(tabs, ANCHORS);
  assert.deepEqual([...plan.pin], [1]);
  assert.equal(plan.close, undefined, 'planAnchors must not decide to close anything');
  assert.deepEqual(plan.notes[0], { index: 0, kind: 'promoted', extraPins: 0, extraTabs: 2 });
});

test('planAnchors: an old pin is unpinned, not closed, when you used another copy more recently', () => {
  const tabs = [
    tab(1, 'https://github.com/old', { pinned: true, lastAccessed: 100 }),
    tab(2, 'https://github.com/new', { lastAccessed: 200 }),
  ];
  const plan = planAnchors(tabs, ANCHORS);
  assert.deepEqual([...plan.pin], [2]);
  assert.deepEqual([...plan.unpin], [1]);
  assert.equal(plan.notes[0].kind, 'promoted');
  assert.equal(plan.notes[0].extraPins, 1);
});

test('planAnchors: a pin you used more recently than the other copies stays pinned', () => {
  const tabs = [
    tab(1, 'https://github.com/inbox', { pinned: true, lastAccessed: 300 }),
    tab(2, 'https://github.com/other', { lastAccessed: 200 }),
  ];
  const plan = planAnchors(tabs, ANCHORS);
  assert.deepEqual([...plan.pin], [1]);
  assert.deepEqual([...plan.unpin], []);
  assert.deepEqual(plan.notes[0], { index: 0, kind: 'kept', extraPins: 0, extraTabs: 1 });
});

test('planAnchors: without last-used times, the existing pin is kept', () => {
  const tabs = [tab(1, 'https://github.com/a'), tab(2, 'https://github.com/b', { pinned: true })];
  const plan = planAnchors(tabs, ANCHORS);
  assert.deepEqual([...plan.pin], [2]);
  assert.equal(plan.notes[0].kind, 'kept');
});

test('planAnchors: running a cleanup again does not swap the pin back', () => {
  const first = [
    tab(1, 'https://github.com/old', { pinned: true, lastAccessed: 100 }),
    tab(2, 'https://github.com/new', { lastAccessed: 200 }),
  ];
  const plan1 = planAnchors(first, ANCHORS);
  // Apply the plan, then plan again on the result.
  const second = first.map(t => ({ ...t, pinned: plan1.pin.has(t.id) || (t.pinned && !plan1.unpin.has(t.id)) }));
  const plan2 = planAnchors(second, ANCHORS);
  assert.deepEqual([...plan2.pin], [...plan1.pin]);
  assert.deepEqual([...plan2.unpin], []);
  assert.equal(plan2.notes[0].kind, 'kept');
});

test('planAnchors: with only pins, the first is kept and extra pins are unpinned', () => {
  const tabs = [tab(1, 'https://github.com/a', { pinned: true }), tab(2, 'https://github.com/b', { pinned: true })];
  const plan = planAnchors(tabs, ANCHORS);
  assert.deepEqual([...plan.pin], [1]);
  assert.deepEqual([...plan.unpin], [2]);
  assert.deepEqual(plan.notes[0], { index: 0, kind: 'kept', extraPins: 1, extraTabs: 0 });
});

test('planAnchors: anchors with no tab are reported missing', () => {
  const plan = planAnchors([tab(1, 'https://github.com/')], ANCHORS);
  assert.deepEqual(plan.missing, [1]);
  assert.equal(plan.notes[1].kind, 'missing');
});

test('planAnchors: pins that match no anchor are left alone', () => {
  const plan = planAnchors([tab(1, 'https://music.example.org/', { pinned: true })], ANCHORS);
  assert.deepEqual([...plan.pin], []);
  assert.deepEqual([...plan.unpin], []);
});

// ── planDuplicates ──────────────────────────────────────────────────────────

test('planDuplicates: closes exact duplicates, keeping the first', () => {
  const tabs = [tab(1, 'https://a.com/x'), tab(2, 'https://a.com/x'), tab(3, 'https://a.com/y')];
  assert.deepEqual([...planDuplicates(tabs, { pin: new Set(), unpin: new Set() })], [2]);
});

test('planDuplicates: an exact copy of an anchor pin is closed, other pages of that site are not', () => {
  const tabs = [
    tab(1, 'https://github.com/acme/app'),
    tab(2, 'https://github.com/acme/app'),
    tab(3, 'https://github.com/acme/app/pull/12'),
  ];
  const close = planDuplicates(tabs, { pin: new Set([1]), unpin: new Set() });
  assert.deepEqual([...close], [2]);
});

test('planDuplicates: unpinned old pins are checked like any other tab', () => {
  const tabs = [
    tab(1, 'https://github.com/a', { pinned: true }), // old pin, about to be unpinned
    tab(2, 'https://github.com/a'),                  // the copy that becomes the pin
  ];
  const close = planDuplicates(tabs, { pin: new Set([2]), unpin: new Set([1]) });
  assert.deepEqual([...close], [1]);
});

test("planDuplicates: never closes the user's own pins", () => {
  const tabs = [tab(1, 'https://a.com/x', { pinned: true }), tab(2, 'https://a.com/x', { pinned: true })];
  assert.deepEqual([...planDuplicates(tabs, { pin: new Set(), unpin: new Set() })], []);
});

// ── planGrouping ────────────────────────────────────────────────────────────

test('planGrouping: makes a group for 2+ ungrouped tabs of the same site', () => {
  const tabs = [tab(1, 'https://a.com/1'), tab(2, 'https://docs.a.com/2'), tab(3, 'https://b.com/')];
  const plan = planGrouping(tabs, []);
  assert.deepEqual(plan.create, [{ domain: 'a.com', tabIds: [1, 2] }]);
  assert.deepEqual(plan.extend, []);
});

test('planGrouping: never touches tabs that are already in a group', () => {
  const tabs = [
    tab(1, 'https://a.com/1', { groupId: 7 }),
    tab(2, 'https://a.com/2', { groupId: 7 }),
    tab(3, 'https://b.com/1', { groupId: 7 }),
  ];
  const plan = planGrouping(tabs, [{ id: 7, title: 'Research' }]);
  assert.deepEqual(plan.create, []);
  assert.deepEqual(plan.extend, []);
});

test("planGrouping: loose tabs join an existing group named after their site", () => {
  const tabs = [tab(1, 'https://a.com/1', { groupId: 7 }), tab(2, 'https://a.com/2')];
  const plan = planGrouping(tabs, [{ id: 7, title: 'a.com' }]);
  assert.deepEqual(plan.extend, [{ groupId: 7, domain: 'a.com', tabIds: [2] }]);
  assert.deepEqual(plan.create, []);
});

test('planGrouping: a group with another name is not reused for a site', () => {
  const tabs = [tab(1, 'https://a.com/1'), tab(2, 'https://a.com/2')];
  const plan = planGrouping(tabs, [{ id: 7, title: 'Work' }]);
  assert.deepEqual(plan.create, [{ domain: 'a.com', tabIds: [1, 2] }]);
  assert.deepEqual(plan.extend, []);
});

test('planGrouping: skips browser pages and tabs it is told to leave alone', () => {
  const tabs = [
    tab(1, 'chrome://settings'), tab(2, 'chrome://extensions'),
    tab(3, 'http://localhost:5173/'), tab(4, 'http://localhost:5173/docs'),
  ];
  const plan = planGrouping(tabs, [], new Set([3]));
  assert.deepEqual(plan.create, []);
});
