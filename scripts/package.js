// Builds dist/tab-tidy-<version>.zip from src/, ready to upload to the
// Chrome Web Store or attach to a GitHub release. Requires the `zip` CLI.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC  = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');

const { version } = JSON.parse(readFileSync(join(SRC, 'manifest.json'), 'utf8'));
const out = join(DIST, `tab-tidy-${version}.zip`);

mkdirSync(DIST, { recursive: true });
rmSync(out, { force: true });
execFileSync('zip', ['-r', '-X', '-q', out, '.', '-x', '.*', '-x', '*/.*'], { cwd: SRC, stdio: 'inherit' });

console.log(`✓ ${out.replace(ROOT, '')}`);
