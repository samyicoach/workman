// Core scan routine shared by the crawler (baseline) and Verifier A (verify).
// Enumerates pages, screenshots each viewport, runs the policy scanner, and
// returns a manifest conforming to harness/schema.json.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { VIEWPORTS, ensureDir, slugForPath, nowIso, reportDirs } from './util.mjs';
import { launch, openPage, screenshot } from './browser.mjs';
import { loadPolicy } from './policy.mjs';

async function discoverLinks(page, target) {
  const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
  const origin = new URL(target).origin;
  const paths = new Set();
  for (const href of hrefs) {
    try {
      const u = new URL(href, target);
      if (u.origin === origin && /\.html?$/.test(u.pathname)) paths.add(u.pathname);
    } catch {
      /* ignore */
    }
  }
  return [...paths];
}

export async function scan({ policyId, target, pages, phase = 'baseline', crawl = false, outDir }) {
  const policy = await loadPolicy(policyId);
  const dirs = reportDirs(policy.id);
  const dir = ensureDir(outDir || (phase === 'baseline' ? dirs.baseline : dirs.current));
  const phaseDirName = phase === 'baseline' ? 'baseline' : 'current';

  const browser = await launch();
  const pageRecords = [];
  const sourceViolations = policy.scanSource ? policy.scanSource() : [];

  let pathList = pages;
  if (crawl) {
    const { context, page } = await openPage(browser, new URL(pages[0], target).toString(), VIEWPORTS[0]);
    const found = await discoverLinks(page, target);
    if (found.length) pathList = found;
    await context.close();
  }

  for (const path of pathList) {
    const url = new URL(path, target).toString();
    const slug = slugForPath(path);
    const record = { url, path, slug, screenshots: {}, violations: [] };
    for (const vp of VIEWPORTS) {
      const { context, page } = await openPage(browser, url, vp);
      const shotPath = join(dir, `${slug}-${vp.name}.png`);
      await screenshot(page, shotPath);
      record.screenshots[vp.name] = `reports/${policy.id}/${phaseDirName}/${slug}-${vp.name}.png`;
      record.violations.push(...(await policy.scanPage(page, { path, viewport: vp.name })));
      await context.close();
    }
    pageRecords.push(record);
  }
  await browser.close();

  if (sourceViolations.length) {
    pageRecords.unshift({ url: target, path: '_source', slug: '_source', screenshots: {}, violations: sourceViolations });
  }

  const byImpact = {};
  let total = 0;
  for (const rec of pageRecords) {
    for (const v of rec.violations) {
      byImpact[v.impact] = (byImpact[v.impact] || 0) + 1;
      total++;
    }
  }

  const manifest = {
    policy: policy.id,
    generatedAt: nowIso(),
    target,
    phase,
    viewports: VIEWPORTS.map((v) => v.name),
    summary: { pages: pageRecords.length, totalViolations: total, byImpact },
    pages: pageRecords,
  };

  writeFileSync(join(dir, 'violations.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}
