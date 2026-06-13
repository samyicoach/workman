// Browser orchestration shared by the crawler and both verifiers.
// Keeps Playwright details in one place so policy scanners stay thin.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, VIEWPORTS } from './util.mjs';

const AXE_SOURCE = readFileSync(join(ROOT, 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');

export async function launch() {
  return chromium.launch({ args: ['--no-sandbox'] });
}

// Open a page at one viewport, wait for the network to settle, and hand the
// caller a Playwright Page. The caller is responsible for closing the context.
export async function openPage(browser, url, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  return { context, page };
}

// Run axe-core inside the page and return its raw violations. We run the full
// rule set (WCAG + best-practice) so structural rules like heading-order are
// available; the policy scanner decides which violations make the work queue.
export async function runAxe(page) {
  await page.evaluate(AXE_SOURCE);
  return page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const results = await window.axe.run(document, { resultTypes: ['violations'] });
    return {
      violations: results.violations,
      url: results.url,
    };
  });
}

export function viewportByName(name) {
  return VIEWPORTS.find((v) => v.name === name) || VIEWPORTS[0];
}

export async function screenshot(page, absPath) {
  await page.screenshot({ path: absPath, fullPage: true });
  return absPath;
}
