// Shared utilities for the Retrofit harness: viewports, paths, arg parsing.
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
export const HARNESS_DIR = dirname(__filename);
export const ROOT = resolve(HARNESS_DIR, '..', '..');

// The two viewports every policy checks. Desktop first, mobile second.
export const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

// Standard output locations. `baseline/` is captured once and never mutated;
// `current/` is regenerated on every verification pass.
export const REPORTS = {
  root: join(ROOT, 'reports'),
  baseline: join(ROOT, 'reports', 'baseline'),
  current: join(ROOT, 'reports', 'current'),
  runs: join(ROOT, 'reports', 'runs'),
};

export function ensureDir(p) {
  mkdirSync(p, { recursive: true });
  return p;
}

// Tiny zero-dependency flag parser: --key value, --key=value, --flag (boolean).
export function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (!tok.startsWith('--')) continue;
    const body = tok.slice(2);
    if (body.includes('=')) {
      const [k, ...rest] = body.split('=');
      args[k] = rest.join('=');
    } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      args[body] = argv[++i];
    } else {
      args[body] = true;
    }
  }
  return args;
}

// A stable, filesystem-safe slug for a page path so screenshots/scans line up
// across baseline and current runs. "/" -> "home", "/about.html" -> "about".
export function slugForPath(pathname) {
  let s = pathname.replace(/^\/+/, '').replace(/\.html?$/, '');
  s = s.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return s || 'home';
}

export function nowIso() {
  return new Date().toISOString();
}
