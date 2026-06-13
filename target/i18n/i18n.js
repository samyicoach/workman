/* Tiny runtime i18n for the demo target.
   - ?lang=<locale> selects a catalog (default: browser/en)
   - ?pseudo=1 wraps every resolved string in ⓟ…ⓞ so the Polyglot scanner can
     prove extraction is total (any un-wrapped visible text is un-extracted).
   Catalogs live in i18n/<locale>.json keyed by the data-i18n attribute. */
(function () {
  var params = new URLSearchParams(location.search);
  var pseudo = params.get('pseudo') === '1';
  var lang = params.get('lang') || 'en';

  function apply(catalog) {
    document.documentElement.setAttribute('lang', pseudo ? 'en-x-pseudo' : lang);
    var nodes = document.querySelectorAll('[data-i18n]');
    nodes.forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var val = (catalog && catalog[key]) || el.textContent.trim();
      el.textContent = pseudo ? 'ⓟ' + val + 'ⓞ' : val;
    });
  }

  fetch('i18n/' + lang + '.json')
    .then(function (r) { return r.ok ? r.json() : {}; })
    .catch(function () { return {}; })
    .then(apply);
})();
