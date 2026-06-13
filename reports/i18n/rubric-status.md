# Rubric status — i18n

_Graded from verifier artifacts only. The Builder cannot flip these._

**5/5 verifiable items green** (1 n/a)

| | Item | Verifier | Detail |
| --- | --- | --- | --- |
| ✅ | 0 hardcoded user-facing strings (pseudo-locale proves extraction total) | A | hardcoded-string=0, pseudo-leak=0 |
| ✅ | All 3 locale catalogs complete (no missing/untranslated keys) | A | locale-completeness=0 |
| ✅ | No overflow/truncation/overlap per locale at 1440 & 390 (German = stress test) | B | no overflow in any locale |
| ➖ | Dates & numbers via Intl, not string concatenation | A | no dynamic date/number formatting on the demo target |
| ✅ | lang attribute correct per locale; language switcher works | A+B | langs={"en":"en","ko":"ko","es":"es","de":"de"} |
| ✅ | Base-locale (English) pixel-identical to pre-migration baseline | B | 1 flagged, all accepted by vision |
