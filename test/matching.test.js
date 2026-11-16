import { test } from 'node:test';
import assert from 'node:assert/strict';

import { anchorIndexFor, getRootDomain, isInternalUrl, matchesAnchor } from '../src/background/matching.js';

test('matchesAnchor: host-only patterns', () => {
  assert.equal(matchesAnchor('https://www.youtube.com/watch?v=x', 'youtube.com'), true);
  assert.equal(matchesAnchor('https://mail.google.com/mail/u/0/', 'mail.google.com'), true);
  assert.equal(matchesAnchor('https://docs.google.com/', 'mail.google.com'), false);
});

test('matchesAnchor: host + path prefix', () => {
  assert.equal(matchesAnchor('https://claude.ai/design/abc', 'claude.ai/design'), true);
  assert.equal(matchesAnchor('https://claude.ai/chat/abc', 'claude.ai/design'), false);
});

test('matchesAnchor: host with port', () => {
  assert.equal(matchesAnchor('http://localhost:5173/', 'localhost:5173'), true);
  assert.equal(matchesAnchor('http://localhost:3000/', 'localhost:5173'), false);
});

test('matchesAnchor: empty or missing url', () => {
  assert.equal(matchesAnchor('', 'youtube.com'), false);
  assert.equal(matchesAnchor(undefined, 'youtube.com'), false);
});

test('anchorIndexFor: most specific anchor wins', () => {
  const anchors = [
    { match: 'claude.ai' },
    { match: 'claude.ai/design' },
    { match: 'youtube.com' },
  ];
  assert.equal(anchorIndexFor('https://claude.ai/new', anchors), 0);
  assert.equal(anchorIndexFor('https://claude.ai/design/x', anchors), 1);
  assert.equal(anchorIndexFor('https://youtube.com/', anchors), 2);
  assert.equal(anchorIndexFor('https://example.com/', anchors), -1);
});

test('getRootDomain', () => {
  assert.equal(getRootDomain('https://www.github.com/foo'), 'github.com');
  assert.equal(getRootDomain('https://docs.github.com/en'), 'github.com');
  assert.equal(getRootDomain('http://localhost:5173/'), 'localhost');
  assert.equal(getRootDomain('not a url'), 'not a url');
});

test('isInternalUrl', () => {
  assert.equal(isInternalUrl('chrome://extensions'), true);
  assert.equal(isInternalUrl('chrome-extension://abc/popup.html'), true);
  assert.equal(isInternalUrl('about:blank'), true);
  assert.equal(isInternalUrl(''), true);
  assert.equal(isInternalUrl('https://example.com'), false);
});
