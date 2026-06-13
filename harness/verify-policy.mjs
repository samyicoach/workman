#!/usr/bin/env node
// Verifier A (policy verifier) — independent re-scan.
//
// Runs in a fresh context: it sees only the live site and the baseline
// manifest, never the Builder's reasoning. Re-runs the policy scanner, then
//   - confirms addressed violations dropped (ideally to zero), and
//   - rejects any REGRESSION (a (page, rule) pair whose count went up).
// Exit 0 = pass. Exit 1 = regression, or violations remain under --require-zero.
//
//   node harness/verify-policy.mjs --policy a11y [--require-zero]
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import defaults from './config.mjs';
import { parseArgs, reportDirs } from './lib/util.mjs';
import { scan } from './lib/scan.mjs';

function countByPageRule(manifest) {
  const map = {}; // path -> ruleId -> count
  for (const p of manifest.pages) {
    map[p.path] ||= {};
    for (const v of p.violations) map[p.path][v.ruleId] = (map[p.path][v.ruleId] || 0) + 1;
  }
  return map;
}

async function main() {
  const args = parseArgs();
  const policyId = args.policy || defaults.policy;
  const requireZero = Boolean(args['require-zero']);

  const baselinePath = join(reportDirs(policyId).baseline, 'violations.json');
  if (!existsSync(baselinePath)) {
    console.error('[verify-A] no baseline found — run `npm run crawl` first.');
    process.exit(2);
  }
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));

  console.log(`[verify-A] re-scanning policy=${policyId} (phase=verify)`);
  const current = await scan({
    policyId,
    target: args.target || baseline.target,
    pages: baseline.pages.filter((p) => p.path !== '_source').map((p) => p.path),
    phase: 'verify',
  });

  const base = countByPageRule(baseline);
  const cur = countByPageRule(current);
  const paths = [...new Set([...Object.keys(base), ...Object.keys(cur)])].sort();

  const regressions = [];
  const fixed = [];
  let remaining = 0;

  console.log('\n  page                 rule                 base -> now');
  console.log('  ' + '-'.repeat(58));
  for (const path of paths) {
    const rules = [...new Set([...Object.keys(base[path] || {}), ...Object.keys(cur[path] || {})])].sort();
    for (const rule of rules) {
      const b = (base[path] || {})[rule] || 0;
      const c = (cur[path] || {})[rule] || 0;
      remaining += c;
      const arrow = c > b ? 'REGRESSION' : c < b ? 'fixed' : '';
      if (c > b) regressions.push({ path, rule, b, c });
      if (c < b) fixed.push({ path, rule, b, c });
      console.log(`  ${path.padEnd(20)} ${rule.padEnd(20)} ${String(b).padStart(4)} -> ${String(c).padStart(3)}  ${arrow}`);
    }
  }

  console.log('\n[verify-A] baseline total:', baseline.summary.totalViolations);
  console.log('[verify-A] current  total:', current.summary.totalViolations);
  console.log('[verify-A] fixed (rule/page pairs reduced):', fixed.length);

  if (regressions.length) {
    console.error('\n[verify-A] FAIL — regressions detected:');
    for (const r of regressions) console.error(`  ${r.path} :: ${r.rule} ${r.b} -> ${r.c}`);
    process.exit(1);
  }
  if (requireZero && remaining > 0) {
    console.error(`\n[verify-A] FAIL — ${remaining} violation(s) remain (--require-zero).`);
    process.exit(1);
  }
  console.log('\n[verify-A] PASS — no regressions' + (remaining === 0 ? ', zero violations.' : `, ${remaining} remaining.`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
