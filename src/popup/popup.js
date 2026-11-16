import { GROUP_COLORS } from '../settings.js';

const $ = id => document.getElementById(id);

const btn        = $('tidy-btn');
const btnLabel   = $('btn-label');
const spinner    = $('spinner');
const logEl      = $('log');
const logInner   = $('log-inner');
const winCount   = $('win-count');
const tabCount   = $('tab-count');
const pinCount   = $('pin-count');
const anchorsEl  = $('anchors-list');
const groupsSec  = $('groups-section');
const groupsGrid = $('groups-grid');

// Chrome tab group color token → CSS color
const colorFor = token => GROUP_COLORS[token] || '#888';

/** Small DOM helper. Text always goes through textContent, never innerHTML. */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function setLoading(on) {
  btn.disabled          = on;
  spinner.style.display = on ? 'block' : 'none';
  btnLabel.textContent  = on ? 'Working…' : 'Run cleanup';
}

function badgeFor(pinned, unpinned) {
  if (unpinned > 0) return el('span', 'badge badge-active', `${unpinned} active tab${unpinned > 1 ? 's' : ''}`);
  if (pinned   > 0) return el('span', 'badge badge-pinned', 'pinned');
  return el('span', 'badge badge-missing', 'missing');
}

function renderPreview(data) {
  winCount.textContent = data.windowCount;
  tabCount.textContent = data.tabCount;
  pinCount.textContent = data.pinnedCount;

  if (!data.anchorsFound.length) {
    anchorsEl.replaceChildren(el('div', 'anchors-empty', 'No anchors set. Add some in Settings.'));
    return;
  }
  anchorsEl.replaceChildren(...data.anchorsFound.map(a => {
    const dot = el('div', 'anchor-dot');
    dot.style.background = colorFor(a.color);

    const row = el('div', 'anchor-row');
    row.append(dot, el('span', 'anchor-name', a.name), badgeFor(a.pinned, a.unpinned));
    return row;
  }));
}

function renderLog(lines) {
  logInner.replaceChildren(...lines.map(l => {
    const row = el('div', `log-row lc-${l.color}`);
    row.append(el('span', 'log-icon', l.icon), el('span', 'log-text', l.text));
    return row;
  }));
  logEl.classList.add('visible');
}

function renderGroups(groups) {
  if (!groups || !groups.length) { groupsSec.classList.remove('visible'); return; }
  groupsGrid.replaceChildren(...groups.map(g => {
    const swatch = el('div', 'group-swatch');
    swatch.style.background = colorFor(g.color);

    const chip = el('div', 'group-chip');
    chip.append(swatch, g.domain, ' ', el('span', 'group-count', String(g.count)));
    return chip;
  }));
  groupsSec.classList.add('visible');
}

function refreshPreview() {
  chrome.runtime.sendMessage({ action: 'preview' }, res => {
    if (res?.windowCount !== undefined) renderPreview(res);
  });
}

// ── Init ──────────────────────────────────────────────────────────────────
$('version').textContent = `v${chrome.runtime.getManifest().version}`;
$('options-btn').addEventListener('click', () => chrome.runtime.openOptionsPage());
refreshPreview();

btn.addEventListener('click', () => {
  setLoading(true);
  logEl.classList.remove('visible');
  groupsSec.classList.remove('visible');

  chrome.runtime.sendMessage({ action: 'tidy' }, res => {
    setLoading(false);
    if (res?.log)    renderLog(res.log);
    if (res?.groups) renderGroups(res.groups);
    refreshPreview();
  });
});
