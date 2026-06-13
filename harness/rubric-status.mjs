#!/usr/bin/env node
// Self-grading rubric. "Done is a file the model grades itself against."
//
// Gathers the verifier artifacts and runs the policy's checks to mark each
// rubric item pass / fail / n.a. Status comes ONLY from machine + recorded
// vision output — the Builder never flips an item. Writes rubric-status.md/json.
//
//   node harness/rubric-status.mjs --policy a11y [--require-green]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import defaults from './config.mjs';
import { parseArgs, reportDirs, ROOT } from './lib/util.mjs';

const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);

function ruleCounts(manifest) {
  const m = {};
  if (!manifest) return m;
  for (const p of manifest.pages) for (const v of p.violations) m[v.ruleId] = (m[v.ruleId] || 0) + 1;
  return m;
}

const ICON = { pass: '✅', fail: '❌', na: '➖' };

async function main() {
  const args = parseArgs();
  const policyId = args.policy || defaults.policy;
  const dirs = reportDirs(policyId);

  const current = readJson(join(dirs.current, 'violations.json'));
  if (!current) {
    console.error(`[rubric] no current scan for ${policyId} — run verify first.`);
    process.exit(2);
  }
  const artifacts = {
    ruleCounts: ruleCounts(current),
    visualDiff: readJson(join(dirs.current, 'visual-diff.json')),
    accepted: readJson(join(dirs.root, 'accepted.json')),
    keyboard: readJson(join(dirs.current, 'keyboard.json')),
    axtree: readJson(join(dirs.root, 'axtree-after.json')),
    overflow: readJson(join(dirs.root, 'locales', 'overflow.json')),
  };

  const { evaluate } = await import(join(ROOT, 'policies', policyId, 'checks.mjs'));
  const checks = evaluate(artifacts);

  const graded = checks.filter((c) => c.status !== 'na');
  const passed = graded.filter((c) => c.status === 'pass').length;
  const allGreen = graded.every((c) => c.status === 'pass');

  let md = `# Rubric status — ${policyId}\n\n`;
  md += `_Graded from verifier artifacts only. The Builder cannot flip these._\n\n`;
  md += `**${passed}/${graded.length} verifiable items green** (${checks.filter((c) => c.status === 'na').length} n/a)\n\n`;
  md += `| | Item | Verifier | Detail |\n| --- | --- | --- | --- |\n`;
  for (const c of checks) md += `| ${ICON[c.status]} | ${c.label} | ${c.verifier} | ${c.detail} |\n`;
  writeFileSync(join(dirs.root, 'rubric-status.md'), md);
  writeFileSync(join(dirs.root, 'rubric-status.json'), JSON.stringify({ policy: policyId, passed, total: graded.length, allGreen, checks }, null, 2));

  console.log(`\n[rubric] ${policyId} — ${passed}/${graded.length} verifiable items green`);
  for (const c of checks) console.log(`  ${ICON[c.status]} ${c.label}  (${c.detail})`);

  if (args['require-green'] && !allGreen) {
    console.error(`\n[rubric] FAIL — not all verifiable items are green.`);
    process.exit(1);
  }
  console.log(`\n[rubric] ${allGreen ? 'GREEN — rubric satisfied.' : 'incomplete.'}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
