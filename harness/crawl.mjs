#!/usr/bin/env node
// Crawler / Mapper — stage 1 of Retrofit.
//
// Enumerate pages, capture baseline screenshots (desktop 1440 + mobile 390),
// run the policy's scanner, and emit reports/<phase>/violations.json. That
// manifest is both the Builder's work queue and the run's progress metric.
//
//   node harness/crawl.mjs --policy a11y [--phase baseline] [--target URL]
//                          [--pages /a.html,/b.html] [--crawl]
import { join } from 'node:path';
import defaults from './config.mjs';
import { parseArgs } from './lib/util.mjs';
import { scan } from './lib/scan.mjs';

async function main() {
  const args = parseArgs();
  const opts = {
    policyId: args.policy || defaults.policy,
    target: args.target || defaults.target,
    phase: args.phase || 'baseline',
    pages: args.pages ? String(args.pages).split(',') : defaults.pages,
    crawl: Boolean(args.crawl || defaults.crawl),
    outDir: args.out ? join(process.cwd(), args.out) : undefined,
  };
  console.log(`[crawl] policy=${opts.policyId} phase=${opts.phase} target=${opts.target}`);
  const m = await scan(opts);
  for (const p of m.pages) console.log(`[crawl] ${p.path}: ${p.violations.length} violation(s)`);
  console.log(`[crawl] TOTAL ${m.summary.totalViolations} violation(s) across ${m.pages.length} page record(s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
