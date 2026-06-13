#!/usr/bin/env node
// Accessibility-tree dump — "what a screen reader announces."
//
// Captures Playwright's accessibility snapshot (role + accessible name) for the
// interesting roles on each page. Run it against the BEFORE and AFTER sites to
// show the screen-reader experience go from gibberish ("image", "", "link") to
// coherent ("Volunteers plating hot meals at the kitchen counter").
//
//   node harness/axtree.mjs --target URL --label before|after --out FILE
import { writeFileSync } from 'node:fs';
import defaults from './config.mjs';
import { parseArgs, slugForPath } from './lib/util.mjs';
import { launch } from './lib/browser.mjs';

const ROLES = new Set(['img', 'image', 'link', 'button', 'textbox', 'heading', 'banner', 'contentinfo']);

// Compute, in the page, what a screen reader would announce for each interesting
// element: its role and accessible name. This mirrors the ARIA accessible-name
// computation closely enough for the demo (alt / aria-label / label / text).
function snapshotInPage() {
  const out = [];
  const named = (el) =>
    (el.getAttribute('aria-label') ||
      (el.getAttribute('aria-labelledby') &&
        document.getElementById(el.getAttribute('aria-labelledby'))?.textContent) ||
      el.textContent ||
      el.title ||
      '').trim();

  document.querySelectorAll('img').forEach((el) => {
    const alt = el.getAttribute('alt');
    out.push({ role: 'img', name: alt === null ? '' : alt, decorative: alt === '' });
  });
  document.querySelectorAll('a[href]').forEach((el) => {
    const inner = el.querySelector('img');
    out.push({ role: 'link', name: named(el) || (inner && inner.getAttribute('alt')) || '' });
  });
  document.querySelectorAll('button').forEach((el) => out.push({ role: 'button', name: named(el) }));
  document.querySelectorAll('input,textarea,select').forEach((el) => {
    const id = el.id;
    const lbl = id && document.querySelector(`label[for="${id}"]`);
    const name =
      el.getAttribute('aria-label') ||
      (lbl && lbl.textContent.trim()) ||
      el.getAttribute('placeholder') ||
      '';
    out.push({ role: 'textbox', name: name.trim() });
  });
  document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((el) =>
    out.push({ role: 'heading', level: Number(el.tagName[1]), name: el.textContent.trim() })
  );
  return out;
}

async function main() {
  const args = parseArgs();
  const target = args.target || defaults.target;
  const label = args.label || 'snapshot';
  const pages = args.pages ? String(args.pages).split(',') : defaults.pages;
  const out = args.out || `axtree-${label}.json`;

  const browser = await launch();
  const result = { label, target, pages: [] };
  for (const path of pages) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(new URL(path, target).toString(), { waitUntil: 'networkidle' });
    const nodes = await page.evaluate(snapshotInPage);
    // Anything a screen reader would announce as empty/uninformative is a problem
    // (decorative images intentionally have an empty name and are excluded).
    const unnamed = nodes.filter(
      (n) => (n.role === 'img' || n.role === 'link' || n.role === 'button' || n.role === 'textbox') && !n.name && !n.decorative
    );
    result.pages.push({ path, slug: slugForPath(path), nodes, unnamedCount: unnamed.length });
    await context.close();
  }
  await browser.close();

  writeFileSync(out, JSON.stringify(result, null, 2));
  const totalUnnamed = result.pages.reduce((s, p) => s + p.unnamedCount, 0);
  console.log(`[axtree] ${label}: wrote ${out} — ${totalUnnamed} unnamed interactive/image node(s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
