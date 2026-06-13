#!/usr/bin/env node
// Verifier B aid for Polyglot — render every locale and detect overflow.
//
// For each page × locale × viewport it loads ?lang=<locale>, screenshots it
// into reports/i18n/locales/, and flags overflow two ways (both machine signals
// that vision then confirms on the screenshot):
//   - page-level horizontal overflow (scrollWidth > viewport width)
//   - element-level text overflow (a text element's scrollWidth exceeds its box)
// German is the stress test. Exit non-zero if any overflow is found.
//
//   node harness/locale-shots.mjs [--locales en,ko,es,de] [--target URL]
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import defaults from './config.mjs';
import { parseArgs, VIEWPORTS, ensureDir, slugForPath, reportDirs } from './lib/util.mjs';
import { launch } from './lib/browser.mjs';

async function main() {
  const args = parseArgs();
  const target = args.target || defaults.target;
  const pages = args.pages ? String(args.pages).split(',') : defaults.pages;
  const locales = (args.locales ? String(args.locales) : 'en,ko,es,de').split(',');
  const outDir = ensureDir(join(reportDirs('i18n').root, 'locales'));

  const browser = await launch();
  const findings = [];

  for (const path of pages) {
    for (const locale of locales) {
      for (const vp of VIEWPORTS) {
        const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
        const page = await context.newPage();
        const url = new URL(path, target);
        url.searchParams.set('lang', locale);
        await page.goto(url.toString(), { waitUntil: 'networkidle' });
        await page.waitForTimeout(150); // let the i18n runtime apply

        const overflow = await page.evaluate(() => {
          const out = { page: false, elements: [] };
          const docW = document.documentElement.clientWidth;
          if (document.documentElement.scrollWidth > docW + 1) out.page = true;
          // Element-level: text elements whose content is wider than their box.
          const sel = 'h1,h2,h3,.btn,nav a,.section-title,.page-title,.lede,.card p,p,span,strong,button';
          for (const el of document.querySelectorAll(sel)) {
            if (el.scrollWidth > el.clientWidth + 1 && el.textContent.trim()) {
              const r = el.getBoundingClientRect();
              if (r.width === 0) continue;
              out.elements.push({
                tag: el.tagName.toLowerCase(),
                cls: el.className || '',
                text: el.textContent.trim().slice(0, 40),
                scrollW: el.scrollWidth,
                clientW: el.clientWidth,
              });
            }
          }
          return out;
        });

        const slug = slugForPath(path);
        const shot = `${slug}-${locale}-${vp.name}.png`;
        await page.screenshot({ path: join(outDir, shot), fullPage: true });

        const hasOverflow = overflow.page || overflow.elements.length > 0;
        if (hasOverflow) {
          findings.push({ path, locale, viewport: vp.name, shot, ...overflow });
        }
        await context.close();
      }
    }
  }
  await browser.close();

  writeFileSync(join(outDir, 'overflow.json'), JSON.stringify({ findings }, null, 2));

  console.log('\n  page / locale / viewport            overflow');
  console.log('  ' + '-'.repeat(52));
  for (const f of findings) {
    const detail = f.page ? 'PAGE' : f.elements.map((e) => `${e.tag}.${e.cls || '·'}`).join(', ');
    console.log(`  ${(`${f.path} ${f.locale} ${f.viewport}`).padEnd(34)} ${detail}`);
  }
  console.log(`\n[locale-shots] wrote reports/i18n/locales/ (${locales.length} locales × ${pages.length} pages × ${VIEWPORTS.length} viewports)`);
  if (findings.length) {
    console.error(`[locale-shots] FAIL — ${findings.length} overflow case(s). Open the screenshots and fix (German is the stress test).`);
    process.exit(1);
  }
  console.log('[locale-shots] PASS — no overflow in any locale.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
