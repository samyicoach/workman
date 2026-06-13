// Ramp (accessibility) scanner.
//
// The machine-verifiable half of the Ramp rubric: axe-core flags presence-level
// failures (missing alt, low contrast, bad heading order, unlabeled inputs,
// focus issues). The *quality* half — is the alt text meaningful, did the layout
// shift — is judged by Verifier B's vision, not here. This module only emits
// what a scanner can prove.
import { runAxe } from '../../harness/lib/browser.mjs';

export const id = 'a11y';
export const name = 'Ramp — WCAG 2.1 AA';

// axe rule -> our coarse category, used to group the work queue.
const CATEGORY = {
  'image-alt': 'images',
  'role-img-alt': 'images',
  'svg-img-alt': 'images',
  'color-contrast': 'contrast',
  'heading-order': 'headings',
  'page-has-heading-one': 'headings',
  'empty-heading': 'headings',
  label: 'forms',
  'form-field-multiple-labels': 'forms',
  'select-name': 'forms',
  'aria-input-field-name': 'forms',
  'html-has-lang': 'lang',
  'html-lang-valid': 'lang',
  tabindex: 'keyboard',
  'focus-order-semantics': 'keyboard',
  'link-name': 'keyboard',
  'button-name': 'keyboard',
};

// Serious + critical land on the queue (matches "0 violations (serious +
// critical)" in the rubric).
const KEPT_IMPACTS = new Set(['serious', 'critical']);
// ...plus these structural rules regardless of axe's impact rating, because the
// rubric names them explicitly ("one h1, no skipped levels").
const ALWAYS_KEEP = new Set(['heading-order', 'page-has-heading-one', 'empty-heading']);

export async function scanPage(page, { path, viewport }) {
  const { violations } = await runAxe(page);
  const out = [];
  for (const v of violations) {
    if (!KEPT_IMPACTS.has(v.impact) && !ALWAYS_KEEP.has(v.id)) continue;
    v.nodes.forEach((node, i) => {
      out.push({
        id: `axe:${v.id}#${path}:${viewport}:${i}`,
        ruleId: v.id,
        impact: v.impact,
        category: CATEGORY[v.id] || 'other',
        description: v.help,
        wcag: (v.tags || []).filter((t) => t.startsWith('wcag') && /\d/.test(t)),
        viewport,
        nodes: [
          {
            target: node.target,
            html: node.html,
            failureSummary: node.failureSummary,
          },
        ],
        status: 'open',
      });
    });
  }
  return out;
}
