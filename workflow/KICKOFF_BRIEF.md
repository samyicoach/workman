# Retrofit — Kickoff brief

You are building **Retrofit**: an autonomous web remediation engine. It takes
(a) a target website (repo or URL set) and (b) a *policy file*, and transforms
the site to satisfy the policy — while guaranteeing, via independent
verification, that the site's visual design does not break.

## Architecture (build exactly this)

1. **Crawler / Mapper** (`harness/crawl.mjs`) — enumerate pages, capture
   baseline screenshots (desktop 1440px + mobile 390px via Playwright), run the
   policy's scanner to produce `reports/baseline/violations.json`. This manifest
   is the work queue and the progress metric.
2. **Builder agent** (`workflow/builder.md`) — fix violations in code, in small
   batches, one commit per logical fix, referencing the violation ID.
3. **Verifier A — policy verifier** (`harness/verify-policy.mjs`, independent
   context) — re-run the policy scanner on changed pages. Addressed items must
   hit zero. No regressions on other pages.
4. **Verifier B — visual verifier** (`harness/visual-capture.mjs`, independent
   context) — screenshot after each batch, compare against baseline using
   vision. Reject any fix that visibly changes layout, spacing, imagery, or
   branding beyond the policy's allowed deltas. When you reject, say exactly why
   and send it back to the Builder.
5. **Loop** until `rubric.md` is fully satisfied. Then open a PR with the
   compliance report (`harness/report.mjs`): before/after counts, per-fix commit
   list, before/after screenshots.

## Rules of engagement

- A fix lands ONLY when both verifiers pass. Verifiers run in fresh contexts;
  they never see the Builder's reasoning, only the artifacts.
- Maintain `NOTES.md` as persistent memory: every rejected fix becomes a general
  rule so the mistake never repeats.
- Definition of done is `rubric.md`. You may not stop before it is green, and you
  must not mark items green yourself — only Verifier A/B outputs count.

## Manifest schema

See `harness/schema.json`. Each violation carries a stable `id` the Builder
references in commit messages, e.g. `axe:color-contrast#/index.html:desktop:0`.
