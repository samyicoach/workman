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

_(append dated entries as Verifier B rejects fixes)_
