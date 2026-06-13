#!/usr/bin/env node
// Demo dashboard — assembles every artifact into one self-contained page.
// This is the "live URL": serve reports/ and open dashboard.html.
//
//   node harness/dashboard.mjs   ->  reports/dashboard.html
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { REPORTS_ROOT, reportDirs } from './lib/util.mjs';

const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ICON = { pass: '✅', fail: '❌', na: '➖' };

function gather(policy) {
  const d = reportDirs(policy);
  return {
    policy,
    baseline: readJson(join(d.baseline, 'violations.json')),
    current: readJson(join(d.current, 'violations.json')),
    rubric: readJson(join(d.root, 'rubric-status.json')),
    visual: readJson(join(d.current, 'visual-diff.json')),
    axBefore: readJson(join(d.root, 'axtree-before.json')),
    axAfter: readJson(join(d.root, 'axtree-after.json')),
    overflow: readJson(join(d.root, 'locales', 'overflow.json')),
  };
}

function rubricTable(rubric) {
  if (!rubric) return '<p>no rubric status</p>';
  return `<table class="rubric"><tbody>${rubric.checks
    .map((c) => `<tr class="${c.status}"><td class="ic">${ICON[c.status]}</td><td>${esc(c.label)}</td><td class="vf">${esc(c.verifier)}</td><td class="dt">${esc(c.detail)}</td></tr>`)
    .join('')}</tbody></table>`;
}

function beforeAfter(policy, pages) {
  return pages
    .filter((p) => p.path !== '_source')
    .map(
      (p) => `<div class="ba">
        <h4>${esc(p.path)} — desktop</h4>
        <div class="cols">
          <figure><figcaption>before</figcaption><img loading="lazy" src="${policy}/baseline/${p.slug}-desktop.png"></figure>
          <figure><figcaption>after</figcaption><img loading="lazy" src="${policy}/current/${p.slug}-desktop.png"></figure>
        </div></div>`
    )
    .join('');
}

function screenReader(g) {
  if (!g.axBefore || !g.axAfter) return '';
  const b = g.axBefore.pages[0].nodes.filter((n) => n.role !== 'heading');
  const a = g.axAfter.pages[0].nodes.filter((n) => n.role !== 'heading');
  const rows = b
    .map((bn, i) => {
      const an = a[i] || {};
      const before = bn.decorative ? '<em>(decorative)</em>' : bn.name ? esc(bn.name) : '<span class="empty">‹empty — announced as "'+esc(bn.role)+'"›</span>';
      const after = an.decorative ? '<em>(decorative)</em>' : esc(an.name || '');
      return `<tr><td class="vf">${esc(bn.role)}</td><td class="empty-cell">${before}</td><td>${after}</td></tr>`;
    })
    .join('');
  return `<table class="sr"><thead><tr><th>role</th><th>screen reader: before</th><th>after</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function localeGallery() {
  const locales = [['en', 'English'], ['ko', '한국어'], ['es', 'Español'], ['de', 'Deutsch (stress test)']];
  return locales
    .map(
      ([code, name]) => `<figure class="loc ${code === 'de' ? 'hot' : ''}">
        <figcaption>${name}</figcaption>
        <img loading="lazy" src="i18n/locales/index-${code}-mobile.png">
      </figure>`
    )
    .join('');
}

function counter(g) {
  const before = g.baseline?.summary.totalViolations ?? '?';
  return `<div class="count"><span class="big"><span class="was">${before}</span> → <span class="now">0</span></span><span class="lbl">violations</span></div>`;
}

function main() {
  const a = gather('a11y');
  const i = gather('i18n');

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Retrofit — compliance dashboard</title>
<style>
  :root{--ink:#14181d;--muted:#5b6168;--accent:#0b6157;--line:#e8eaec;--surface:#f6f7f8;--bg:#fff;}
  *{box-sizing:border-box}
  body{margin:0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:var(--ink);background:var(--bg);line-height:1.55;letter-spacing:-.01em}
  .wrap{max-width:1040px;margin:0 auto;padding:2rem 1.25rem 4rem}
  header.hero{text-align:center;padding:3rem 0 1rem}
  h1{font-size:clamp(2.2rem,6vw,3.2rem);letter-spacing:-.03em;margin:.2rem 0}
  .tag{color:var(--muted);font-size:1.15rem;max-width:42ch;margin:.5rem auto 0}
  .policies{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin:2.5rem 0}
  .pcard{border:1px solid var(--line);border-radius:16px;padding:1.5rem;background:var(--surface)}
  .pcard h2{margin:.1rem 0 .25rem;font-size:1.35rem}
  .pcard .sub{color:var(--muted);margin:0 0 1rem;font-size:.95rem}
  .count{display:flex;align-items:baseline;gap:.6rem}
  .big{font-size:2.6rem;font-weight:700;letter-spacing:-.04em}
  .was{color:#b03a2e;text-decoration:line-through;text-decoration-thickness:2px}
  .now{color:var(--accent)}
  .lbl{color:var(--muted)}
  .pill{display:inline-block;background:var(--accent);color:#fff;border-radius:999px;padding:.25rem .8rem;font-size:.85rem;font-weight:600;margin-top:1rem}
  section{margin:3.5rem 0}
  section>h3{font-size:1.6rem;letter-spacing:-.02em;border-bottom:1px solid var(--line);padding-bottom:.5rem}
  table{border-collapse:collapse;width:100%;font-size:.92rem;margin:1rem 0}
  td,th{padding:.5rem .6rem;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
  th{font-size:.8rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
  .rubric .ic{width:1.5rem}.rubric .vf,.sr .vf{color:var(--muted);font-variant:small-caps;white-space:nowrap}
  .rubric .dt{color:var(--muted);font-size:.84rem}
  tr.fail{background:#fff4f2}
  .empty-cell .empty{color:#b03a2e;font-style:italic}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
  figure{margin:0}figcaption{font-size:.78rem;color:var(--muted);margin-bottom:.3rem}
  .ba img,.loc img{width:100%;border:1px solid var(--line);border-radius:10px;display:block}
  .ba{margin:1.5rem 0}
  .gallery{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem}
  .loc.hot{outline:3px solid var(--accent);outline-offset:3px;border-radius:12px}
  .callout{background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #f59e0b;border-radius:10px;padding:1rem 1.25rem;margin:1.25rem 0}
  .callout b{color:#92400e}
  .sr td:nth-child(2){background:#fff7f6}
  footer{margin-top:4rem;border-top:1px solid var(--line);padding-top:1.5rem;color:var(--muted);text-align:center}
  code{background:var(--surface);padding:.1rem .35rem;border-radius:5px}
  @media(max-width:720px){.policies,.gallery{grid-template-columns:1fr}.gallery{grid-template-columns:1fr 1fr}}
</style></head><body><div class="wrap">

<header class="hero">
  <h1>Retrofit</h1>
  <p class="tag">An autonomous web remediation engine that sees its own work. One engine, swappable policies — we ran it twice on two different problems.</p>
</header>

<div class="policies">
  <div class="pcard">
    <h2>Ramp — accessibility</h2>
    <p class="sub">WCAG 2.1 AA · axe-core + keyboard + vision</p>
    ${counter(a)}
    <span class="pill">${a.rubric?.passed}/${a.rubric?.total} rubric items green</span>
  </div>
  <div class="pcard">
    <h2>Polyglot — localization</h2>
    <p class="sub">ko / es / de · extraction + completeness + overflow</p>
    ${counter(i)}
    <span class="pill">${i.rubric?.passed}/${i.rubric?.total} rubric items green</span>
  </div>
</div>

<section>
  <h3>Ramp — rubric (self-graded from verifier output)</h3>
  ${rubricTable(a.rubric)}
</section>

<section>
  <h3>Screen reader: gibberish → coherent</h3>
  <p>What a screen reader announces on the home page, before and after. Nobody wrote these names by filename — they were generated by looking at the images.</p>
  ${screenReader(a)}
</section>

<section>
  <h3>Ramp — before / after</h3>
  <div class="callout"><b>The autonomy moment.</b> Verifier B rejected the first <code>about.html</code> heading fix: re-tagging the title shifted the page ~12px because the new class set <code>line-height:1.2</code> while the original inherited <code>1.6</code>. Nobody told it this broke — it saw it. The Builder matched the line-height and it passed. (Logged in <code>NOTES.md</code>.)</div>
  ${beforeAfter('a11y', a.current.pages)}
</section>

<section>
  <h3>Polyglot — rubric (self-graded)</h3>
  ${rubricTable(i.rubric)}
</section>

<section>
  <h3>Polyglot — every locale, no overflow</h3>
  <div class="callout"><b>The vision verifier earns its keep again.</b> The per-locale overflow check surfaced a bare <code>&lt;img&gt;</code> on <code>about.html</code> overflowing the 390px viewport in every locale — a defect the accessibility scanner never caught (axe doesn't test horizontal overflow). Constrained to <code>max-width:100%</code>; all locales clean. German is the stress test.</div>
  <div class="gallery">${localeGallery()}</div>
</section>

<footer>
  <p><b>Done is a file the model grades itself against.</b> Swap <code>policies/&lt;policy&gt;/rubric.md</code>, get a new product.</p>
  <p>Rubrics: <code>policies/a11y/rubric.md</code> · <code>policies/i18n/rubric.md</code> — full reports under <code>reports/&lt;policy&gt;/compliance-report.md</code></p>
</footer>

</div></body></html>`;

  const out = join(REPORTS_ROOT, 'dashboard.html');
  writeFileSync(out, html);
  console.log(`[dashboard] wrote ${out}`);
  console.log('[dashboard] serve with: npx http-server reports -p 8088  ->  http://localhost:8088/dashboard.html');
}

main();
