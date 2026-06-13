// Polyglot (localization) scanner.
//
// Three independent checks, all machine-verifiable:
//   1. hardcoded-string lint  (static, over target HTML source)
//   2. locale completeness    (static, over the i18n catalog)
//   3. pseudo-locale leakage  (runtime, render with ?pseudo=1 and look for any
//                              visible text NOT wrapped in the pseudo markers)
//
// Convention the target site follows: every user-facing string carries a
// `data-i18n="key"` attribute and lives in `target/i18n/<locale>.json`. A tiny
// runtime (`target/i18n/i18n.js`) applies the catalog and supports
// `?lang=<locale>` and `?pseudo=1`.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../harness/lib/util.mjs';

export const id = 'i18n';
export const name = 'Polyglot — ko / es / de';

export const LOCALES = ['ko', 'es', 'de'];
const I18N_DIR = join(ROOT, 'target', 'i18n');
const PSEUDO_OPEN = 'ⓟ';
const PSEUDO_CLOSE = 'ⓞ'; // see target/i18n/i18n.js — wraps each string in ⓟ…ⓞ

// Elements whose text is never user-facing.
const SKIP_TAGS = /^(script|style|noscript|template|svg|path|head|meta|link|title)$/i;

// ---- Check 1 + 2 run once per crawl, not per page. ----
export function scanSource() {
  const out = [];
  out.push(...lintHardcodedStrings());
  out.push(...checkLocaleCompleteness());
  return out;
}

function htmlFiles() {
  const dir = join(ROOT, 'target');
  return readdirSync(dir).filter((f) => /\.html?$/.test(f)).map((f) => join(dir, f));
}

// Very small HTML text-node walker: flags non-whitespace text whose nearest
// element lacks data-i18n. Good enough to prove extraction is total on the
// demo target; a production target would lint the framework's source instead.
function lintHardcodedStrings() {
  const out = [];
  for (const file of htmlFiles()) {
    const html = readFileSync(file, 'utf8');
    const name = file.split('/').pop();
    // Strip skip-tag blocks so their contents don't count as user-facing.
    const cleaned = html.replace(
      /<(script|style|noscript|template|svg|head)[\s\S]*?<\/\1>/gi,
      ''
    );
    // Find text between tags.
    const re = />([^<>{}]+)</g;
    let m;
    while ((m = re.exec(cleaned)) !== null) {
      const text = m[1].trim();
      if (!text || !/[A-Za-zÀ-ɏ]/.test(text)) continue; // ignore punctuation/whitespace
      // Look back at the opening tag for this text node.
      const before = cleaned.slice(0, m.index);
      const openTag = before.match(/<([a-zA-Z][\w-]*)\b[^<>]*>$/);
      if (openTag && SKIP_TAGS.test(openTag[1])) continue;
      const carriesKey = openTag && /\bdata-i18n\s*=/.test(openTag[0]);
      if (carriesKey) continue;
      out.push({
        id: `i18n:hardcoded-string#${name}:${m.index}`,
        ruleId: 'hardcoded-string',
        impact: 'serious',
        category: 'strings',
        description: `Hardcoded user-facing string "${text.slice(0, 40)}" in ${name} — wrap in data-i18n key`,
        nodes: [{ target: [name], html: text.slice(0, 80) }],
        status: 'open',
      });
    }
  }
  return out;
}

function loadCatalog(locale) {
  const f = join(I18N_DIR, `${locale}.json`);
  if (!existsSync(f)) return null;
  return JSON.parse(readFileSync(f, 'utf8'));
}

function checkLocaleCompleteness() {
  const out = [];
  const en = loadCatalog('en');
  if (!en) {
    out.push({
      id: 'i18n:missing-base-catalog',
      ruleId: 'locale-completeness',
      impact: 'critical',
      category: 'locale',
      description: 'Base catalog target/i18n/en.json is missing',
      nodes: [],
      status: 'open',
    });
    return out;
  }
  const keys = Object.keys(en);
  for (const locale of LOCALES) {
    const cat = loadCatalog(locale);
    if (!cat) {
      out.push({
        id: `i18n:missing-catalog#${locale}`,
        ruleId: 'locale-completeness',
        impact: 'critical',
        category: 'locale',
        description: `Locale catalog target/i18n/${locale}.json is missing`,
        nodes: [],
        status: 'open',
      });
      continue;
    }
    for (const k of keys) {
      const missing = !(k in cat) || cat[k] == null || cat[k] === '';
      const untranslated = cat[k] === en[k] || cat[k] === k;
      if (missing || untranslated) {
        out.push({
          id: `i18n:${missing ? 'missing-key' : 'untranslated'}#${locale}:${k}`,
          ruleId: 'locale-completeness',
          impact: 'serious',
          category: 'locale',
          description: `${locale}.json: key "${k}" ${missing ? 'missing' : 'untranslated (equals English/key)'}`,
          nodes: [{ target: [`${locale}.json`, k] }],
          status: 'open',
        });
      }
    }
  }
  return out;
}

// ---- Check 3 runs per page, in the browser, under the pseudo-locale. ----
export async function scanPage(page, { path, viewport }) {
  // Re-render under the pseudo-locale so un-extracted strings stand out.
  const url = new URL(page.url());
  url.searchParams.set('pseudo', '1');
  await page.goto(url.toString(), { waitUntil: 'networkidle' });

  const leaks = await page.evaluate(
    ({ open, close }) => {
      const found = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const text = node.textContent.trim();
        if (!text) continue;
        const tag = node.parentElement?.tagName?.toLowerCase() || '';
        if (/^(script|style|noscript)$/.test(tag)) continue;
        if (!/[A-Za-zÀ-ɏ가-힣]/.test(text)) continue;
        // Under the pseudo-locale every translated string is wrapped ⓟ…ⓞ.
        const wrapped = text.includes(open) && text.includes(close);
        if (!wrapped) {
          found.push({ tag, text: text.slice(0, 60), sample: node.parentElement?.outerHTML?.slice(0, 100) });
        }
      }
      return found;
    },
    { open: PSEUDO_OPEN, close: PSEUDO_CLOSE }
  );

  return leaks.map((leak, i) => ({
    id: `i18n:pseudo-leak#${path}:${viewport}:${i}`,
    ruleId: 'pseudo-leak',
    impact: 'serious',
    category: 'strings',
    description: `Un-extracted string under pseudo-locale: "${leak.text}" (<${leak.tag}>)`,
    viewport,
    nodes: [{ target: [leak.tag], html: leak.sample }],
    status: 'open',
  }));
}
