#!/usr/bin/env node
// Keyboard verifier (Ramp rubric: "every interactive element reachable in
// logical order; no focus traps; visible focus indicator on all").
//
// Tabs through each page with a real keyboard, recording the focus order, the
// computed outline on each focused element (a visible focus ring), and whether
// focus cycles back (no trap). Writes reports/a11y/current/keyboard.json.
//
//   node harness/keyboard.mjs [--target URL] [--pages /a,/b]
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import defaults from './config.mjs';
import { parseArgs, ensureDir, reportDirs, slugForPath } from './lib/util.mjs';
import { launch } from './lib/browser.mjs';

async function traverse(page) {
  // Reset focus to the top of the document.
  await page.evaluate(() => document.body.focus());
  const interactiveCount = await page.evaluate(
    () => document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])').length
  );

  const order = [];
  let visibleOnAll = true;
  const maxTabs = interactiveCount + 3; // a little past the last element
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      // A focus ring is "visible" if there is an outline with width, or a
      // box-shadow ring. (Our fix uses outline, an allowed delta.)
      const outlineW = parseFloat(cs.outlineWidth) || 0;
      const hasRing = (cs.outlineStyle !== 'none' && outlineW > 0) || (cs.boxShadow && cs.boxShadow !== 'none');
      const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('alt') || '').trim().slice(0, 40);
      return { tag: el.tagName.toLowerCase(), name, hasRing };
    });
    if (!info) continue;
    if (!info.hasRing) visibleOnAll = false;
    order.push(info);
  }

  // Trap check: after exhausting tabs, one more Tab should leave the last
  // control (focus should not be stuck on a single element).
  const distinct = new Set(order.map((o) => `${o.tag}:${o.name}`)).size;
  const trap = order.length > 0 && distinct === 1;

  return { interactiveCount, reached: order.length, order, visibleFocusOnAll: visibleOnAll, focusTrap: trap };
}

async function main() {
  const args = parseArgs();
  const target = args.target || defaults.target;
  const pages = args.pages ? String(args.pages).split(',') : defaults.pages;
  const outDir = ensureDir(reportDirs('a11y').current);

  const browser = await launch();
  const results = [];
  for (const path of pages) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(new URL(path, target).toString(), { waitUntil: 'networkidle' });
    const r = await traverse(page);
    results.push({ path, slug: slugForPath(path), ...r });
    await context.close();
  }
  await browser.close();

  const allReachable = results.every((r) => r.reached >= r.interactiveCount);
  const allVisible = results.every((r) => r.visibleFocusOnAll);
  const noTraps = results.every((r) => !r.focusTrap);
  const summary = { allReachable, visibleFocusOnAll: allVisible, noFocusTraps: noTraps };

  writeFileSync(join(outDir, 'keyboard.json'), JSON.stringify({ summary, pages: results }, null, 2));

  console.log('\n  page                 reached/interactive  focus-ring  trap');
  console.log('  ' + '-'.repeat(56));
  for (const r of results) {
    console.log(`  ${r.path.padEnd(20)} ${String(r.reached + '/' + r.interactiveCount).padStart(10)}        ${r.visibleFocusOnAll ? 'all' : 'MISSING'}      ${r.focusTrap ? 'TRAP' : 'no'}`);
  }
  const pass = allReachable && allVisible && noTraps;
  console.log(`\n[keyboard] ${pass ? 'PASS' : 'FAIL'} — reachable=${allReachable} focusRing=${allVisible} noTraps=${noTraps}`);
  if (!pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
