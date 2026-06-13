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

# 1. serve the demo target (a deliberately broken nonprofit site)
npm run serve            # http://localhost:8080

# 2. smoke test the loop on one page (do this before the full run)
npm run smoke -- --policy a11y --page /index.html

# 3. baseline crawl — produces the work queue
npm run crawl -- --policy a11y

# 4. ... Builder fixes target/ ...

# 5. verify (independent re-scan + visual diff)
npm run verify -- --policy a11y --require-zero
npm run capture -- --policy a11y

# 6. compliance report for the PR
npm run report -- --policy a11y
```

Swap the policy to localize the same site:

```bash
npm run crawl   -- --policy i18n
# ... Builder completes ko/es/de catalogs ...
npm run verify  -- --policy i18n --require-zero   # locale completeness + extraction
npm run locales -- --locales en,ko,es,de          # per-locale overflow (German = stress test)
npm run report  -- --policy i18n
```

Point it at any site with `--target https://example.org --pages /,/about`.

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
harness/        crawler, verifiers, report, shared lib, violations.json schema
policies/
  a11y/         Ramp: rubric.md + axe-core scanner
  i18n/         Polyglot: rubric.md + hardcoded-string/locale/pseudo scanner
  locale-shots.mjs  Polyglot Verifier B aid: render every locale, detect overflow
workflow/       kickoff brief + Builder / Verifier A / Verifier B prompts
target/         demo site under remediation
reports/<policy>/  baseline/, current/, locales/ artifacts + compliance report
NOTES.md        persistent memory — rules distilled from rejected fixes
```

## Definition of done

`policies/<policy>/rubric.md`. The Builder may not mark items green — only
Verifier A (scanner) and Verifier B (vision) output flips an item.

---

_See `readme.md` for the project work log._
