#!/usr/bin/env node
// Records a ~60s captioned walkthrough to a .webm using Playwright's video
// capture. Drives the live dashboard (:8088) and the localized demo site (:8080).
//
//   node harness/record-demo.mjs   ->  reports/retrofit-demo.webm
import { chromium } from 'playwright';
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { REPORTS_ROOT } from './lib/util.mjs';

const DASH = 'http://localhost:8088/dashboard.html';
const SITE = 'http://localhost:8080/index.html';
const W = 1280, H = 720;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function caption(page, text) {
  await page.evaluate((t) => {
    let el = document.getElementById('__cap');
    if (!el) {
      el = document.createElement('div');
      el.id = '__cap';
      el.style.cssText =
        'position:fixed;left:0;right:0;bottom:0;z-index:99999;background:rgba(10,20,18,.92);' +
        'color:#fff;font:600 26px/1.35 system-ui,sans-serif;letter-spacing:-.01em;padding:18px 28px;' +
        'box-shadow:0 -8px 24px rgba(0,0,0,.25)';
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, text);
}

async function scrollTo(page, sel) {
  await page.evaluate((s) => {
    const target = typeof s === 'number' ? s : (document.querySelector(s)?.getBoundingClientRect().top ?? 0) + window.scrollY - 90;
    window.scrollTo({ top: target, behavior: 'smooth' });
  }, sel);
}

async function main() {
  const tmp = join(REPORTS_ROOT, '.video-tmp');
  if (existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: tmp, size: { width: W, height: H } } });
  const page = await context.newPage();

  // 1. Hero + counters
  await page.goto(DASH, { waitUntil: 'networkidle' });
  await caption(page, 'Retrofit — an autonomous web remediation engine that sees its own work.');
  await sleep(4500);
  await caption(page, 'One engine, swappable policies. Accessibility 32 → 0.  Localization 63 → 0.');
  await sleep(5000);

  // 2. Rubric self-graded
  await scrollTo(page, 'section:nth-of-type(1) table');
  await sleep(800);
  await caption(page, 'Every rubric item is graded by the verifiers — never by the Builder.');
  await sleep(5000);

  // 3. Screen reader before/after
  await scrollTo(page, '.sr');
  await sleep(800);
  await caption(page, 'Screen reader, before → after: empty → meaningful. Alt text written by looking at the images.');
  await sleep(6500);

  // 4. The autonomy moment
  await scrollTo(page, '.callout');
  await sleep(800);
  await caption(page, 'The autonomy moment: Verifier B rejected its OWN fix — it saw a 12px layout shift. Nobody told it.');
  await sleep(6500);

  // 5. Live site — English → Korean → German
  await page.goto(SITE, { waitUntil: 'networkidle' });
  await caption(page, 'The live remediated site.');
  await sleep(3000);
  await page.goto(SITE + '?lang=ko', { waitUntil: 'networkidle' });
  await caption(page, 'Same site — Korean. Swap the policy file, get a new product.');
  await sleep(3500);
  await page.goto(SITE + '?lang=de', { waitUntil: 'networkidle' });
  await caption(page, 'German — the overflow stress test. The vision verifier confirms: no overflow.');
  await sleep(4500);

  // 6. Locale gallery + close
  await page.goto(DASH, { waitUntil: 'networkidle' });
  await scrollTo(page, '.gallery');
  await sleep(800);
  await caption(page, 'Every locale, at 1440 and 390 — clean.');
  await sleep(4000);
  await scrollTo(page, 'footer');
  await sleep(800);
  await caption(page, 'Done is a file the model grades itself against. Anyone can rerun this tomorrow.');
  await sleep(5000);

  await page.close();
  await context.close(); // flushes the video
  await browser.close();

  // Move the recorded file to a stable name.
  const out = join(REPORTS_ROOT, 'retrofit-demo.webm');
  const { readdirSync } = await import('node:fs');
  const file = readdirSync(tmp).find((f) => f.endsWith('.webm'));
  renameSync(join(tmp, file), out);
  rmSync(tmp, { recursive: true, force: true });
  console.log(`[record] wrote ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
