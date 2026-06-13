// Default run configuration. Override any field on the CLI, e.g.
//   node harness/crawl.mjs --target http://localhost:8080 --policy a11y
export default {
  target: 'http://localhost:8080',
  // Pages to remediate, relative to target. The crawler can also auto-discover
  // by following same-origin links when `crawl: true`, but an explicit list
  // keeps runs deterministic — which matters when the manifest is the metric.
  pages: ['/index.html', '/about.html'],
  crawl: false,
  policy: 'a11y',
};
