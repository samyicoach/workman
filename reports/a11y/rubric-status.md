# Rubric status — a11y

_Graded from verifier artifacts only. The Builder cannot flip these._

**7/7 verifiable items green** (1 n/a)

| | Item | Verifier | Detail |
| --- | --- | --- | --- |
| ✅ | axe-core: 0 serious/critical violations, desktop + mobile | A | 0 violations |
| ✅ | Keyboard: all reachable, logical order, no traps, visible focus | A | reachable=true focusRing=true noTraps=true |
| ✅ | Meaningful alt text on every image (decorative = empty) | A+B | image-alt=0, unnamed nodes=0 (names confirmed by vision) |
| ✅ | Color contrast ≥ AA, brand hue preserved | A | color-contrast=0 |
| ✅ | Valid heading hierarchy (one h1, no skipped levels) | A | heading-order=0, page-has-heading-one=0 |
| ✅ | Every input has a programmatic label; errors via aria-live | A | label=0 (aria-live status region present) |
| ✅ | Layout diff within threshold (contrast/focus allowed, shifts rejected) | B | 1 flagged, all accepted by vision |
| ➖ | Lighthouse accessibility ≥ 95 | A | Lighthouse not installed in this environment |
