#!/usr/bin/env node
// Verifier B (visual verifier) — independent visual comparison.
//
// Runs in a fresh context with NO access to the Builder's reasoning. It pairs
// each baseline screenshot with the current one and produces:
//   - visual-diff.json: per page/viewport height delta (a cheap, dependency-free
//     layout-shift signal read straight from the PNG header), and
//   - visual-review.html: a side-by-side contact sheet for the final vision call.
//
// The rubric allows contrast/focus-ring deltas but FORBIDS layout shift. A large
// full-page height change is a strong layout-shift signal, so we flag it here;
// the actual accept/reject is made by looking at the pair (vision).
//
//   node harness/visual-capture.mjs [--threshold 0.02]
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import defaults from './config.mjs';
import { parseArgs, reportDirs } from './lib/util.mjs';

// width/height live at byte offsets 16 and 20 of a PNG (big-endian uint32).
function pngSize(path) {
  const buf = readFileSync(path);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function main() {
  const args = parseArgs();
  const policyId = args.policy || defaults.policy;
  const dirs = reportDirs(policyId);
  const threshold = Number(args.threshold ?? 0.02); // 2% full-page height change

  if (!existsSync(dirs.baseline) || !existsSync(dirs.current)) {
    console.error(`[verify-B] need both reports/${policyId}/baseline and /current — run crawl then verify first.`);
    process.exit(2);
  }

  const shots = readdirSync(dirs.baseline).filter((f) => f.endsWith('.png'));
  const pairs = [];
  let flagged = 0;

  for (const f of shots) {
    const basePath = join(dirs.baseline, f);
    const curPath = join(dirs.current, f);
    if (!existsSync(curPath)) {
      pairs.push({ shot: f, status: 'missing-current', note: 'no current screenshot — page not re-captured' });
      flagged++;
      continue;
    }
    const b = pngSize(basePath);
    const c = pngSize(curPath);
    const heightDelta = Math.abs(c.height - b.height) / b.height;
    const widthChanged = b.width !== c.width;
    const layoutShift = heightDelta > threshold || widthChanged;
    if (layoutShift) flagged++;
    pairs.push({
      shot: f,
      baseline: `../baseline/${f}`,
      current: `${f}`,
      baseSize: b,
      currentSize: c,
      heightDelta: Number(heightDelta.toFixed(4)),
      layoutShiftSignal: layoutShift,
      verdict: layoutShift ? 'REVIEW — possible layout shift' : 'within threshold (vision still decides)',
    });
  }

  writeFileSync(join(dirs.current, 'visual-diff.json'), JSON.stringify({ policy: policyId, threshold, pairs }, null, 2));
  writeContactSheet(dirs.current, pairs, threshold);

  console.log('\n  screenshot                     Δheight   signal');
  console.log('  ' + '-'.repeat(54));
  for (const p of pairs) {
    const d = p.heightDelta != null ? (p.heightDelta * 100).toFixed(1) + '%' : '   -';
    console.log(`  ${p.shot.padEnd(30)} ${String(d).padStart(6)}   ${p.layoutShiftSignal ? 'REVIEW' : 'ok'}`);
  }
  console.log(`\n[verify-B] wrote reports/${policyId}/current/visual-diff.json and visual-review.html`);
  if (flagged) {
    console.error(`[verify-B] ${flagged} pair(s) flagged for layout-shift review — open visual-review.html and judge with vision.`);
    process.exit(1);
  }
  console.log('[verify-B] PASS — no layout-shift signal. Confirm allowed deltas (contrast/focus) with vision.');
}

function writeContactSheet(outDir, pairs, threshold) {
  const rows = pairs
    .map(
      (p) => `
    <section class="pair ${p.layoutShiftSignal ? 'flag' : ''}">
      <h2>${basename(p.shot)} <small>Δheight ${p.heightDelta != null ? (p.heightDelta * 100).toFixed(1) + '%' : 'n/a'} — ${p.verdict}</small></h2>
      <div class="cols">
        <figure><figcaption>baseline</figcaption><img src="${p.baseline || ''}" /></figure>
        <figure><figcaption>current</figcaption><img src="${p.current || ''}" /></figure>
      </div>
    </section>`
    )
    .join('\n');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<title>Retrofit — Verifier B contact sheet</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; color: #14181d; }
  .pair { border-top: 1px solid #e5e7eb; padding: 1.5rem 0; }
  .pair.flag { background: #fff7ed; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  figure { margin: 0; }
  figcaption { font-size: 0.8rem; color: #6b7280; margin-bottom: 0.35rem; }
  img { width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; }
  small { color: #6b7280; font-weight: 400; }
</style></head><body>
<h1>Verifier B — visual review</h1>
<p>Layout-shift threshold: Δheight &gt; ${(threshold * 100).toFixed(0)}%. Allowed deltas: contrast, focus ring, link underline. Forbidden: layout shift, font/image swaps.</p>
${rows}
</body></html>`;
  writeFileSync(join(outDir, 'visual-review.html'), html);
}

main();
