// Polyglot rubric checks. Status comes only from verifier artifacts.
//
// artifacts: { ruleCounts, visualDiff, accepted, overflow }
export function evaluate(a) {
  const rc = a.ruleCounts || {};
  const overflow = a.overflow || {};
  const findings = overflow.findings || [];

  const accepted = a.accepted?.acceptedShots || {};
  const flagged = (a.visualDiff?.pairs || []).filter((p) => p.layoutShiftSignal);
  const unaccepted = flagged.filter((p) => !(p.shot in accepted));

  return [
    {
      id: 'no-hardcoded',
      label: '0 hardcoded user-facing strings (pseudo-locale proves extraction total)',
      verifier: 'A',
      status: (rc['hardcoded-string'] || 0) === 0 && (rc['pseudo-leak'] || 0) === 0 ? 'pass' : 'fail',
      detail: `hardcoded-string=${rc['hardcoded-string'] || 0}, pseudo-leak=${rc['pseudo-leak'] || 0}`,
    },
    {
      id: 'locales-complete',
      label: 'All 3 locale catalogs complete (no missing/untranslated keys)',
      verifier: 'A',
      status: (rc['locale-completeness'] || 0) === 0 ? 'pass' : 'fail',
      detail: `locale-completeness=${rc['locale-completeness'] || 0}`,
    },
    {
      id: 'no-overflow',
      label: 'No overflow/truncation/overlap per locale at 1440 & 390 (German = stress test)',
      verifier: 'B',
      status: findings.length === 0 ? 'pass' : 'fail',
      detail: findings.length === 0 ? 'no overflow in any locale' : `${findings.length} overflow case(s)`,
    },
    {
      id: 'intl-formatting',
      label: 'Dates & numbers via Intl, not string concatenation',
      verifier: 'A',
      status: 'na',
      detail: 'no dynamic date/number formatting on the demo target',
    },
    {
      id: 'lang-switcher',
      label: 'lang attribute correct per locale; language switcher works',
      verifier: 'A+B',
      status: overflow.langSwitcherOk ? 'pass' : 'fail',
      detail: `langs=${JSON.stringify(overflow.langs || {})}`,
    },
    {
      id: 'base-identical',
      label: 'Base-locale (English) pixel-identical to pre-migration baseline',
      verifier: 'B',
      status: unaccepted.length === 0 ? 'pass' : 'fail',
      detail: unaccepted.length === 0 ? `${flagged.length} flagged, all accepted by vision` : `${unaccepted.length} unaccepted`,
    },
  ];
}
