# NOTES — persistent memory

Every rejected fix gets distilled into a general rule here so the mistake never
repeats. Append; never delete a rule that is still true.

## Rules (a11y / Ramp)

- **Contrast = lightness only.** When a contrast fix is rejected, it is almost
  always because the hue drifted or a color was swapped for an unrelated one.
  Darken/lighten within the same hue (HSL: keep H, move L). Verify the brand is
  still recognizable.
- **Fix contrast in CSS variables, not per-element.** Changing `--muted` once
  fixes every occurrence and keeps the change reviewable as one delta.
- **alt text comes from the image, not the filename or the heading next to it.**
  Describe what the image conveys in context. Decorative → `alt=""`.
- **Heading fixes re-tag, never restyle.** Changing an `h3` to `h2` must not
  change its visual size — add a class or size rule so the page looks identical.
- **Form labels must not move layout.** Prefer `aria-label` or a visually-hidden
  `.sr-only` `<label>` when adding a visible label would reflow the form.
- **Focus rings are allowed but must not add layout.** Use `outline`
  (which doesn't take space), not `border` (which does).

## Rules (i18n / Polyglot)

- **German is the overflow stress test.** Fix overflow with `min-width: 0`,
  `flex-wrap`, or larger hit areas — never by truncating or shrinking font below
  the design.
- **Base-locale English must stay pixel-identical.** Routing English through the
  catalog must reproduce the exact original strings.

## Rejections log

- **2026-06-13 — about.html h2→h1 re-tag.** Verifier B flagged ~1.1% height
  shift on about-desktop/mobile: content below the title crept up ~12px. Cause:
  the new `.page-title` class set `line-height: 1.2`, but the original `<h2>`
  inherited the body's `line-height: 1.6`. **Rule:** when re-tagging a heading to
  preserve its look, match `line-height` too, not just `font-size` and `margin`.
  An un-set line-height inherits `body` (1.6 here) — replicate that exactly.
