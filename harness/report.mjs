#!/usr/bin/env node
// Compliance report — assembles the PR summary from the verifier artifacts:
// before/after violation counts, per-rule deltas, and before/after screenshots.
//
//   node harness/report.mjs [--out reports/compliance-report.md]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import defaults from './config.mjs';
import { parseArgs, reportDirs } from './lib/util.mjs';

function byRule(manifest) {
  const m = {};
  for (const p of manifest.pages) for (const v of p.violations) m[v.ruleId] = (m[v.ruleId] || 0) + 1;
  return m;
}

function main() {
  const args = parseArgs();
  const policyId = args.policy || defaults.policy;
  const dirs = reportDirs(policyId);
  const basePath = join(dirs.baseline, 'violations.json');
  const curPath = join(dirs.current, 'violations.json');
  if (!existsSync(basePath) || !existsSync(curPath)) {
    console.error('[report] need baseline and current manifests — run crawl + verify first.');
    process.exit(2);
  }
  const base = JSON.parse(readFileSync(basePath, 'utf8'));
  const cur = JSON.parse(readFileSync(curPath, 'utf8'));
  const visual = existsSync(join(dirs.current, 'visual-diff.json'))
    ? JSON.parse(readFileSync(join(dirs.current, 'visual-diff.json'), 'utf8'))
    : null;

  const b = byRule(base);
  const c = byRule(cur);
  const rules = [...new Set([...Object.keys(b), ...Object.keys(c)])].sort();

  let md = `# Retrofit compliance report — ${base.policy}\n\n`;
  md += `**Target:** ${base.target}\n\n`;
  md += `**Baseline:** ${base.summary.totalViolations} violations · **After:** ${cur.summary.totalViolations} violations\n\n`;
  md += `## Violations by rule\n\n| Rule | Before | After |\n| --- | ---: | ---: |\n`;
  for (const r of rules) md += `| \`${r}\` | ${b[r] || 0} | ${c[r] || 0} |\n`;
  md += `| **Total** | **${base.summary.totalViolations}** | **${cur.summary.totalViolations}** |\n\n`;

  if (visual) {
    md += `## Visual verification (Verifier B)\n\n| Screenshot | Δheight | Signal |\n| --- | ---: | --- |\n`;
    for (const p of visual.pairs) {
      const d = p.heightDelta != null ? (p.heightDelta * 100).toFixed(1) + '%' : 'n/a';
      md += `| \`${p.shot}\` | ${d} | ${p.layoutShiftSignal ? '⚠️ review' : '✅ within threshold'} |\n`;
    }
    md += `\n`;
  }

  md += `## Before / after screenshots\n\n`;
  for (const p of cur.pages.filter((p) => p.path !== '_source')) {
    md += `### \`${p.path}\`\n\n`;
    for (const vp of Object.keys(p.screenshots)) {
      md += `| before | after |\n| --- | --- |\n`;
      md += `| ![](baseline/${p.slug}-${vp}.png) | ![](current/${p.slug}-${vp}.png) |\n\n`;
    }
  }

  const outPath = args.out ? join(process.cwd(), args.out) : join(dirs.root, 'compliance-report.md');
  writeFileSync(outPath, md);
  console.log(`[report] wrote ${outPath}`);
  console.log(`[report] ${base.summary.totalViolations} -> ${cur.summary.totalViolations} violations`);
}

main();
