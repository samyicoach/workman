# Retrofit

**An autonomous web remediation engine. One engine, swappable policies.**

Retrofit takes a target website and a *policy file* and transforms the site to
satisfy the policy — while guaranteeing, through two independent verifiers, that
the visual design does not break.

- **Ramp** (`policies/a11y`) — WCAG 2.1 AA accessibility remediation. The deep demo.
- **Polyglot** (`policies/i18n`) — localization into Korean, Spanish, German. The generality proof.

Swap the rubric file, get a new product.

## How it works

```
Crawler/Mapper  ─►  violations.json  ─►  Builder  ─►  Verifier A (policy)  ─┐
   (baseline)         (work queue)       (fixes)      Verifier B (visual)  ─┴─► PR
        ▲                                                    │
        └──────────────────── loop until rubric green ◄──────┘
```

1. **Crawler** (`harness/crawl.mjs`) enumerates pages, screenshots them at 1440px
   and 390px, runs the policy scanner, and writes `reports/baseline/violations.json`
   — the work queue and the progress metric.
2. **Builder** (`workflow/builder.md`) fixes violations in small batches, one
   commit per logical fix, referencing the violation id.
3. **Verifier A** (`harness/verify-policy.mjs`) re-scans in a fresh context:
   addressed rules must hit zero, no regressions allowed.
4. **Verifier B** (`harness/visual-capture.mjs`) compares before/after
   screenshots with vision: contrast/focus-ring deltas allowed, layout shifts
   rejected.
5. A fix lands only when **both** verifiers pass. Loop until the rubric is green.

The verifiers run independently and never see the Builder's reasoning — only the
artifacts (live site + screenshots + manifest).

## Quick start

```bash
npm install
npx playwright install chromium chromium-headless-shell
npm run serve                       # demo target on http://localhost:8080
```

Then run the whole verification loop for a policy with one command:

```bash
npm run retrofit -- --policy a11y   # Verifier A + B + keyboard + axtree + rubric gate + report
npm run retrofit -- --policy i18n   # same engine, different policy file
npm run dashboard                   # build reports/dashboard.html (the demo)
npx http-server reports -p 8088     # open http://localhost:8088/dashboard.html
```

The individual steps (used by the orchestrator, also runnable alone):

| Command | Role |
| --- | --- |
| `npm run crawl -- --policy a11y [--baseline]` | Crawler/Mapper → `violations.json` work queue |
| `npm run verify -- --policy a11y --require-zero` | **Verifier A** — independent policy re-scan |
| `npm run capture -- --policy a11y` | **Verifier B** — visual diff (honors `accepted.json`) |
| `npm run keyboard` | a11y keyboard traversal / focus / trap check |
| `npm run locales` | i18n per-locale overflow + lang check (German = stress test) |
| `npm run rubric -- --policy a11y --require-green` | self-grade rubric from verifier artifacts |
| `npm run report -- --policy a11y` | before/after compliance report |
| `npm run smoke -- --policy a11y --page /index.html` | one-page sanity check |

Point it at any site with `--target https://example.org --pages /,/about`.

See **`DEMO.md`** for the 3-minute run sheet.

## Results on the demo target

| Policy | Before | After | Verifier B |
| --- | ---: | ---: | --- |
| **Ramp** (a11y) | 32 violations | **0** | only allowed deltas (contrast/focus); no forbidden layout shift |
| **Polyglot** (i18n) | 63 violations | **0** | no overflow in en/ko/es/de |

See `reports/a11y/compliance-report.md` and `reports/i18n/compliance-report.md`.
Both runs caught and self-corrected a real defect (a heading line-height shift; a
mobile image overflow) — recorded in `NOTES.md`.

## Layout

```
harness/
  crawl.mjs / lib/      Crawler/Mapper + shared browser/scan/util + violations schema
  verify-policy.mjs     Verifier A (independent policy re-scan)
  visual-capture.mjs    Verifier B (visual diff; honors accepted.json)
  keyboard.mjs          a11y keyboard / focus / trap verifier
  axtree.mjs            screen-reader accessible-name dump (before/after)
  locale-shots.mjs      i18n per-locale overflow + lang check (German = stress test)
  rubric-status.mjs     self-grades the rubric from verifier artifacts only
  retrofit.mjs          one-command orchestrator (verify suite + gate + report)
  dashboard.mjs         builds reports/dashboard.html
policies/
  a11y/ , i18n/         rubric.md + scanner.mjs + checks.mjs per policy
workflow/       kickoff brief + Builder / Verifier A / Verifier B prompts
target/         demo site under remediation
reports/<policy>/  baseline/, current/, locales/, rubric-status, compliance report
NOTES.md        persistent memory — rules distilled from rejected fixes
DEMO.md         3-minute demo run sheet
```

## Definition of done

`policies/<policy>/rubric.md`. The Builder may not mark items green — only
Verifier A (scanner) and Verifier B (vision) output flips an item.

---

_See `readme.md` for the project work log._
