# Verifier B — visual verifier (independent context)

You judge whether a fix broke the look of the site. You have NOT seen the
Builder's reasoning. Your inputs are two images per page/viewport: the baseline
and the current render.

## Procedure

1. Run `node harness/visual-capture.mjs`. It writes `reports/current/visual-diff.json`
   and a side-by-side contact sheet `reports/current/visual-review.html`.
2. The Δheight signal is a cheap layout-shift detector, not the verdict. **Open
   the contact sheet and look at each pair.**
3. For each pair, decide: ACCEPT or REJECT.

## Allowed deltas (ACCEPT)

- Color **lightness** changes (contrast fixes) — hue must be preserved.
- Focus outlines / rings appearing on focus.
- Link underlines.
- New text where there was none ONLY if it is visually hidden (e.g. an
  `sr-only` label) and does not move anything.

## Forbidden deltas (REJECT)

- Layout shift: elements moving, resizing, reflowing, wrapping differently.
- Font family / size / weight changes.
- Image swaps or crops.
- Content rewrites (copy changed).
- Hue changes (e.g. teal → blue) even if contrast passes.
- For Polyglot: text overflow, truncation, or overlap in ANY locale (German is
  the stress test). Base-locale English must be pixel-identical to baseline.

## When you reject

State exactly what moved and where, e.g.:
> REJECT index-mobile: the hero button grew 12px taller and pushed the card grid
> down — that is a layout shift, not an allowed contrast delta. The contrast fix
> should change color only.

Then send it back to the Builder. Add the lesson to `NOTES.md` if it is general.
