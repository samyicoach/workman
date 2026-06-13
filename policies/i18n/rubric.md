# Policy: Polyglot (localization)

**Goal:** Externalize and localize the target pages into Korean, Spanish, and
German with zero visual breakage per locale.

The Builder may not mark any item green. Only Verifier A (scanner) and
Verifier B (vision) outputs flip an item from `[ ]` to `[x]`.

## Done means

- [ ] **0 hardcoded user-facing strings** (lint rule passes; pseudo-locale `ⓟⓢⓔⓤⓓⓞ` render proves extraction is total) — _Verifier A_
- [ ] **All 3 locale files complete** — no missing keys, no untranslated fallbacks — _Verifier A_
- [ ] **No overflow per locale**: no text overflow, truncation, or overlapping elements at 1440px and 390px. German is the stress test — flag and fix every overflow it causes — _Verifier B (vision)_
- [ ] **Dates & numbers via `Intl`**, not string concatenation — _Verifier A_
- [ ] **`lang` attribute correct per locale**; language switcher works — _Verifier A + Verifier B_
- [ ] **Base locale (English) pixel-identical** to pre-migration baseline — _Verifier B_

## Scanner

`policies/i18n/scanner.mjs`:
1. **hardcoded-string lint** — flags user-facing text not routed through the
   i18n catalog (`data-i18n` keys / `t()` calls).
2. **locale completeness** — every key present in every locale, no value equal
   to its key or to the English fallback.
3. **pseudo-locale render** — wraps every resolved string in `ⓟⓢⓔⓤⓓⓞ`; any
   plain text still visible on the page is un-extracted.

## Locales

`ko` (Korean) · `es` (Spanish) · `de` (German) — German is the overflow stress test.

## Forbidden

layout breakage · truncation · overlap · base-locale pixel drift
