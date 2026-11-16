import { loadSettings, resetSettings, saveSettings } from '../background/storage.js';
import { GROUP_COLORS, LIMITS, validateSettings } from '../settings.js';

const $ = id => document.getElementById(id);

const form         = $('settings-form');
const anchorsList  = $('anchors-list');
const anchorsEmpty = $('anchors-empty');
const addBtn       = $('add-anchor');
const firstEnabled = $('first-enabled');
const firstFields  = $('first-fields');
const formErrors   = $('form-errors');
const saveBtn      = $('save-btn');
const resetBtn     = $('reset-btn');
const statusEl     = $('status');

const ANCHOR_KEYS = ['name', 'color', 'match', 'url'];
const FIRST_KEYS  = ['name', 'match', 'url'];
const NO_ERRORS   = { anchors: [], firstTab: {}, form: [] };

let state      = null;  // what the form shows: { anchors, firstTab }
let savedJson  = '';    // `state` as last loaded or saved, to spot unsaved edits
let showErrors = false; // after a failed save, re-validate on every edit
let anchorRefs = [];    // per card: key → { input, error }

const firstRefs = Object.fromEntries(FIRST_KEYS.map(key =>
  [key, { input: $(`first-${key}`), error: $(`first-${key}-error`) }]));

const colorFor = token => GROUP_COLORS[token] || '#888';

/** Small DOM helper. Text always goes through textContent, never innerHTML. */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// ── Building blocks ─────────────────────────────────────────────────────────

let fieldId = 0;

/** A labelled input with a slot for its error message. */
function field(labelText, input, className = 'field') {
  input.id = `anchor-field-${++fieldId}`;
  const error = el('div', 'field-error');
  error.id = `${input.id}-error`;
  input.setAttribute('aria-describedby', error.id);

  const label = el('label', 'field-label', labelText);
  label.htmlFor = input.id;

  const wrap = el('div', className);
  wrap.append(label, input, error);
  return { wrap, input, error };
}

function textInput(value, placeholder, type = 'text') {
  const input = el('input');
  input.type         = type;
  input.value        = value;
  input.placeholder  = placeholder;
  input.autocomplete = 'off';
  input.spellcheck   = false;
  input.setAttribute('autocapitalize', 'off');
  return input;
}

function colorSelect(value) {
  const select = el('select');
  for (const token of Object.keys(GROUP_COLORS)) {
    const option = el('option', null, token[0].toUpperCase() + token.slice(1));
    option.value = token;
    select.append(option);
  }
  select.value = value;
  return select;
}

function iconButton(text, label, action, onClick) {
  const btn = el('button', `icon-btn icon-btn-${action}`, text);
  btn.type           = 'button';
  btn.dataset.action = action;
  btn.title          = label;
  btn.setAttribute('aria-label', label);
  btn.addEventListener('click', onClick);
  return btn;
}

function anchorCard(anchor, i, count) {
  const pos   = i + 1;
  const dot   = el('span', 'anchor-dot');
  const title = el('span', 'anchor-title', anchor.name.trim() || 'New anchor');
  dot.style.background = colorFor(anchor.color);

  const up     = iconButton('↑', `Move anchor ${pos} up`,   'up',     () => moveAnchor(i, -1));
  const down   = iconButton('↓', `Move anchor ${pos} down`, 'down',   () => moveAnchor(i, +1));
  const remove = iconButton('✕', `Remove anchor ${pos}`,    'remove', () => removeAnchor(i));
  up.disabled   = i === 0;
  down.disabled = i === count - 1;

  const actions = el('div', 'card-actions');
  actions.append(up, down, remove);

  const head = el('div', 'card-head');
  head.append(el('span', 'anchor-pos', String(pos)), dot, title, actions);

  const refs = {
    name:  field('Name',        textInput(anchor.name,  'Gmail')),
    color: field('Color',       colorSelect(anchor.color)),
    match: field('Match',       textInput(anchor.match, 'mail.google.com')),
    url:   field('URL to open', textInput(anchor.url,   'https://mail.google.com', 'url')),
  };
  refs.match.input.inputMode = 'url';

  const fields = el('div', 'fields');
  for (const key of ANCHOR_KEYS) {
    const { wrap, input } = refs[key];
    fields.append(wrap);
    input.addEventListener(key === 'color' ? 'change' : 'input', () => {
      state.anchors[i][key] = input.value;
      if (key === 'color') dot.style.background = colorFor(input.value);
      if (key === 'name')  title.textContent = input.value.trim() || 'New anchor';
      onEdit();
    });
  }
  anchorRefs.push(refs);

  const card = el('li', 'card anchor-card');
  card.setAttribute('aria-label', `Anchor ${pos}`);
  card.append(head, fields);
  return card;
}

// ── Rendering ───────────────────────────────────────────────────────────────

function renderAnchors() {
  anchorRefs = [];
  anchorsList.replaceChildren(...state.anchors.map((a, i) => anchorCard(a, i, state.anchors.length)));
  anchorsEmpty.hidden = state.anchors.length > 0;
  addBtn.disabled     = state.anchors.length >= LIMITS.anchors;
}

function renderFirstTab() {
  firstEnabled.checked  = state.firstTab.enabled;
  firstFields.disabled  = !state.firstTab.enabled;
  for (const key of FIRST_KEYS) firstRefs[key].input.value = state.firstTab[key];
}

function setError({ input, error }, message) {
  error.textContent = message ?? '';
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

function renderErrors(errors) {
  anchorRefs.forEach((refs, i) => {
    for (const key of ANCHOR_KEYS) setError(refs[key], errors.anchors[i]?.[key]);
  });
  for (const key of FIRST_KEYS) setError(firstRefs[key], errors.firstTab[key]);
  formErrors.replaceChildren(...errors.form.map(message => el('p', null, message)));
}

function setStatus(text, kind = '') {
  statusEl.textContent = text;
  statusEl.className   = kind ? `status status-${kind}` : 'status';
}

function render() {
  renderAnchors();
  renderFirstTab();
  renderErrors(showErrors ? validateSettings(state).errors : NO_ERRORS);
}

// ── Editing ─────────────────────────────────────────────────────────────────

const isDirty = () => JSON.stringify(state) !== savedJson;

function onEdit() {
  if (showErrors) renderErrors(validateSettings(state).errors);
  setStatus(isDirty() ? 'Unsaved changes' : '');
}

function moveAnchor(i, delta) {
  const j = i + delta;
  [state.anchors[i], state.anchors[j]] = [state.anchors[j], state.anchors[i]];
  render();

  // Keep focus on the arrow that was pressed, unless the card hit the end.
  const card = anchorsList.children[j];
  const same = card.querySelector(`[data-action="${delta < 0 ? 'up' : 'down'}"]`);
  (same.disabled ? card.querySelector(`[data-action="${delta < 0 ? 'down' : 'up'}"]`) : same).focus();
  onEdit();
}

function removeAnchor(i) {
  state.anchors.splice(i, 1);
  render();
  const next = anchorsList.children[Math.min(i, state.anchors.length - 1)];
  (next ? next.querySelector('[data-action="remove"]') : addBtn).focus();
  onEdit();
}

function addAnchor() {
  if (!state) return;
  const used  = new Set(state.anchors.map(a => a.color));
  const color = Object.keys(GROUP_COLORS).find(c => !used.has(c)) ?? 'grey';
  state.anchors.push({ name: '', match: '', url: '', color });
  render();
  anchorRefs.at(-1).name.input.focus();
  onEdit();
}

// ── Load, save, reset ───────────────────────────────────────────────────────

async function load() {
  const { anchors, firstTab } = await loadSettings();
  state      = { anchors, firstTab };
  savedJson  = JSON.stringify(state);
  showErrors = false;
  render();
}

async function save(event) {
  event.preventDefault();
  if (!state) return;

  const result = validateSettings(state);
  if (!result.ok) {
    showErrors = true;
    renderErrors(result.errors);
    setStatus('Fix the highlighted fields, then save again.', 'error');
    document.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }

  saveBtn.disabled = true;
  try {
    await saveSettings(result.settings);
    // Show the cleaned-up values (trimmed, lowercase host) that were stored.
    state      = structuredClone(result.settings);
    savedJson  = JSON.stringify(state);
    showErrors = false;
    render();
    setStatus('Saved. The next cleanup will use these settings.', 'ok');
  } catch (err) {
    setStatus(`Couldn't save: ${err.message}`, 'error');
  } finally {
    saveBtn.disabled = false;
  }
}

// Reset asks for a second click rather than a confirm() dialog, so it behaves
// the same in Chrome's embedded options dialog and in a tab.
let resetTimer = 0;

function disarmReset() {
  clearTimeout(resetTimer);
  resetTimer = 0;
  resetBtn.textContent = 'Reset to defaults';
  resetBtn.classList.remove('armed');
}

async function reset() {
  if (!resetTimer) {
    resetBtn.textContent = 'Click again to reset';
    resetBtn.classList.add('armed');
    resetTimer = setTimeout(disarmReset, 4000);
    return;
  }
  disarmReset();
  try {
    await resetSettings();
    await load();
    setStatus('Defaults restored.', 'ok');
  } catch (err) {
    setStatus(`Couldn't reset: ${err.message}`, 'error');
  }
}

// ── Init ────────────────────────────────────────────────────────────────────

$('version').textContent = `v${chrome.runtime.getManifest().version}`;

form.addEventListener('submit', save);
addBtn.addEventListener('click', addAnchor);
resetBtn.addEventListener('click', reset);
resetBtn.addEventListener('blur', disarmReset);

firstEnabled.addEventListener('change', () => {
  state.firstTab.enabled = firstEnabled.checked;
  firstFields.disabled   = !firstEnabled.checked;
  onEdit();
});
for (const key of FIRST_KEYS) {
  firstRefs[key].input.addEventListener('input', () => {
    state.firstTab[key] = firstRefs[key].input.value;
    onEdit();
  });
}

load().catch(err => setStatus(`Couldn't load settings: ${err.message}`, 'error'));
