#!/usr/bin/env node
// Smoke test — prove the loop works on ONE page before the full run.
// Scans a single page, asserts the manifest is well-formed, and reports counts.
//
//   node harness/smoke.mjs [--policy a11y] [--page /index.html] [--target URL]
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import defaults from './config.mjs';
import { parseArgs } from './lib/util.mjs';
import { scan } from './lib/scan.mjs';

async function main() {
  const args = parseArgs();
  const policyId = args.policy || defaults.policy;
  const target = args.target || defaults.target;
  const page = args.page || defaults.pages[0];
  const outDir = mkdtempSync(join(tmpdir(), 'retrofit-smoke-'));

  console.log(`[smoke] policy=${policyId} page=${page} target=${target}`);
  const m = await scan({ policyId, target, pages: [page], phase: 'verify', outDir });

  const assert = (cond, msg) => {
    if (!cond) {
      console.error(`[smoke] FAIL: ${msg}`);
      process.exit(1);
    }
  };
  assert(m.policy === policyId, 'manifest policy matches');
  assert(Array.isArray(m.pages) && m.pages.length >= 1, 'at least one page record');
  assert(typeof m.summary.totalViolations === 'number', 'summary has totalViolations');
  const pageRec = m.pages.find((p) => p.path === page);
  assert(pageRec, 'page record present');
  assert(Object.keys(pageRec.screenshots).length >= 1, 'screenshots captured');

  console.log(`[smoke] PASS — loop works. ${m.summary.totalViolations} violation(s) found on ${page}.`);
  console.log(`[smoke] screenshots + manifest in ${outDir}`);
}

main().catch((e) => {
  console.error('[smoke] ERROR', e);
  process.exit(1);
});
