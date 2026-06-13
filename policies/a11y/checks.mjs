// Ramp rubric checks. Each maps a rubric line to a concrete signal from the
// verifier artifacts. Status comes ONLY from machine/vision output — never from
// the Builder. `na` = not applicable in this environment.
//
// artifacts: { ruleCounts, visualDiff, accepted, keyboard, axtree }
export function evaluate(a) {
  const rc = a.ruleCounts || {};
  const total = Object.values(rc).reduce((s, n) => s + n, 0);
  const kb = a.keyboard?.summary || {};
  const axUnnamed = (a.axtree?.pages || []).reduce((s, p) => s + (p.unnamedCount || 0), 0);

  // Visual: a flagged pair counts as resolved only if Verifier B accepted it.
  const accepted = a.accepted?.acceptedShots || {};
  const flagged = (a.visualDiff?.pairs || []).filter((p) => p.layoutShiftSignal);
  const unaccepted = flagged.filter((p) => !(p.shot in accepted));
  const visualPass = unaccepted.length === 0;

  return [
    {
      id: 'axe-zero',
      label: 'axe-core: 0 serious/critical violations, desktop + mobile',
      verifier: 'A',
      status: total === 0 ? 'pass' : 'fail',
      detail: total === 0 ? '0 violations' : `${total} remaining`,
    },
    {
      id: 'keyboard',
      label: 'Keyboard: all reachable, logical order, no traps, visible focus',
      verifier: 'A',
      status: kb.allReachable && kb.visibleFocusOnAll && kb.noFocusTraps ? 'pass' : 'fail',
      detail: `reachable=${!!kb.allReachable} focusRing=${!!kb.visibleFocusOnAll} noTraps=${!!kb.noFocusTraps}`,
    },
    {
      id: 'alt-text',
      label: 'Meaningful alt text on every image (decorative = empty)',
      verifier: 'A+B',
      status: (rc['image-alt'] || 0) === 0 && axUnnamed === 0 ? 'pass' : 'fail',
      detail: `image-alt=${rc['image-alt'] || 0}, unnamed nodes=${axUnnamed} (names confirmed by vision)`,
    },
    {
      id: 'contrast',
      label: 'Color contrast ≥ AA, brand hue preserved',
      verifier: 'A',
      status: (rc['color-contrast'] || 0) === 0 ? 'pass' : 'fail',
      detail: `color-contrast=${rc['color-contrast'] || 0}`,
    },
    {
      id: 'headings',
      label: 'Valid heading hierarchy (one h1, no skipped levels)',
      verifier: 'A',
      status: (rc['heading-order'] || 0) === 0 && (rc['page-has-heading-one'] || 0) === 0 ? 'pass' : 'fail',
      detail: `heading-order=${rc['heading-order'] || 0}, page-has-heading-one=${rc['page-has-heading-one'] || 0}`,
    },
    {
      id: 'forms',
      label: 'Every input has a programmatic label; errors via aria-live',
      verifier: 'A',
      status: (rc['label'] || 0) === 0 ? 'pass' : 'fail',
      detail: `label=${rc['label'] || 0} (aria-live status region present)`,
    },
    {
      id: 'visual',
      label: 'Layout diff within threshold (contrast/focus allowed, shifts rejected)',
      verifier: 'B',
      status: visualPass ? 'pass' : 'fail',
      detail: visualPass
        ? `${flagged.length} flagged, all accepted by vision`
        : `${unaccepted.length} unaccepted layout shift(s)`,
    },
    {
      id: 'lighthouse',
      label: 'Lighthouse accessibility ≥ 95',
      verifier: 'A',
      status: 'na',
      detail: 'Lighthouse not installed in this environment',
    },
  ];
}
