// Sanity checks for src/manifest.json, run in CI.
// Catches the easy-to-miss mistakes: bad JSON, a malformed version, and paths
// that point at files which were renamed or moved.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const errors = [];

let manifest;
try {
  manifest = JSON.parse(readFileSync(join(SRC, 'manifest.json'), 'utf8'));
} catch (e) {
  console.error(`✗ src/manifest.json is not valid JSON: ${e.message}`);
  process.exit(1);
}

if (manifest.manifest_version !== 3) {
  errors.push(`manifest_version must be 3 (got ${manifest.manifest_version})`);
}

// Chrome accepts 1–4 dot-separated integers, each 0–65535, no leading zeros.
const versionOk = /^(0|[1-9]\d{0,4})(\.(0|[1-9]\d{0,4})){0,3}$/.test(manifest.version ?? '')
  && manifest.version.split('.').every(n => Number(n) <= 65535);
if (!versionOk) errors.push(`version "${manifest.version}" is not a valid Chrome extension version`);

const referenced = [
  manifest.background?.service_worker,
  manifest.action?.default_popup,
  ...Object.values(manifest.icons ?? {}),
  ...Object.values(manifest.action?.default_icon ?? {}),
].filter(Boolean);

for (const file of referenced) {
  if (!existsSync(join(SRC, file))) errors.push(`referenced file is missing: src/${file}`);
}

if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  process.exit(1);
}
console.log(`✓ manifest OK (v${manifest.version}, ${referenced.length} referenced files present)`);
