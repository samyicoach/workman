#!/usr/bin/env node
// Retrofit orchestrator — one command, runs the full verification loop for a
// policy and prints a single summary. Each step is a separate process (the
// verifiers run in independent contexts). Stops on the first failure so a
// regression can never slip through.
//
//   node harness/retrofit.mjs --policy a11y        # verify suite + grade + report
//   node harness/retrofit.mjs --policy i18n
//   node harness/retrofit.mjs --policy a11y --baseline   # (re)establish the before
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import defaults from './config.mjs';
import { parseArgs, reportDirs } from './lib/util.mjs';

const SCRIPTS = dirname(fileURLToPath(import.meta.url)); // the harness/ directory

function run(script, extra = []) {
  const label = script.replace('.mjs', '');
  process.stdout.write(`\n\x1b[1m▶ ${label}\x1b[0m\n`);
  const res = spawnSync('node', [join(SCRIPTS, script), ...extra], { stdio: 'inherit' });
  if (res.status !== 0) {
    console.error(`\n\x1b[31m✖ ${label} failed (exit ${res.status}) — stopping. Fix and re-run.\x1b[0m`);
    process.exit(res.status || 1);
  }
}

function readJson(p) {
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
}

async function main() {
  const args = parseArgs();
  const policy = args.policy || defaults.policy;
  const pol = ['--policy', policy];

  console.log(`\x1b[1m═══ Retrofit · policy=${policy} ═══\x1b[0m`);

  if (args.baseline) {
    run('crawl.mjs', [...pol, '--phase', 'baseline']);
    console.log('\nBaseline established. Hand off to the Builder, then re-run without --baseline.');
    return;
  }

  // Verifier A — policy re-scan (independent).
  run('verify-policy.mjs', [...pol, '--require-zero']);
  // Verifier B — visual capture/diff.
  run('visual-capture.mjs', pol);
  // Policy-specific verifiers.
  if (policy === 'a11y') {
    run('keyboard.mjs');
    run('axtree.mjs', ['--target', args.target || defaults.target, '--label', 'after', '--out', join(reportDirs('a11y').root, 'axtree-after.json')]);
  } else if (policy === 'i18n') {
    run('locale-shots.mjs');
  }
  // Self-grading rubric (gate) + compliance report.
  run('rubric-status.mjs', [...pol, '--require-green']);
  run('report.mjs', pol);

  // Summary.
  const dirs = reportDirs(policy);
  const base = readJson(join(dirs.baseline, 'violations.json'));
  const cur = readJson(join(dirs.current, 'violations.json'));
  const rubric = readJson(join(dirs.root, 'rubric-status.json'));
  console.log('\n\x1b[1m═══ SUMMARY ═══\x1b[0m');
  console.log(`  policy:   ${policy}`);
  console.log(`  violations: ${base?.summary.totalViolations ?? '?'} → ${cur?.summary.totalViolations ?? '?'}`);
  console.log(`  rubric:   ${rubric?.passed}/${rubric?.total} verifiable items green${rubric?.allGreen ? ' ✅' : ''}`);
  console.log(`  report:   reports/${policy}/compliance-report.md`);
  console.log('\n\x1b[32m✔ Loop complete — both verifiers passed, rubric green, no regressions.\x1b[0m');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
