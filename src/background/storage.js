// Thin wrapper around chrome.storage.sync for Tab Tidy's settings. The
// validation and default rules live in ../settings.js.
//
// Settings are read fresh on every call, so a change saved in the options
// page applies to the very next preview or cleanup.

import { defaultSettings, mergeWithDefaults } from '../settings.js';

const KEYS = ['anchors', 'firstTab', 'domainGroupColors'];

/** The current settings: what the user saved, with defaults for the rest. */
export async function loadSettings() {
  const stored = await chrome.storage.sync.get(KEYS);
  return mergeWithDefaults(stored, defaultSettings());
}

/** Saves settings already checked with validateSettings(). */
export async function saveSettings({ anchors, firstTab }) {
  await chrome.storage.sync.set({ anchors, firstTab });
}

/** Forgets everything the user saved, so the defaults apply again. */
export async function resetSettings() {
  await chrome.storage.sync.remove(KEYS);
}
