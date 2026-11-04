(() => {
  'use strict';
  const main = document.querySelector('main');
  if (!main) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const tracked = new Set();
  const selector = '.section-title,.section-copy,.motivation-recordings,.motivation-context,#viewpoint-demo,.recorded-demo,.assembly,.hardware-grid,.transfer,#dataset-wall,#model-lab,#evaluation-lab,#progress-definition,.qr-study,.efficiency,.closing-grid,.citation,.reading';

  function inViewport(node) {
    const rect = node.getBoundingClientRect();
    return rect.top < innerHeight && rect.bottom > 0;
  }

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (reduced.matches || (entry.isIntersecting && entry.intersectionRatio >= .06)) {
        entry.target.classList.add('is-revealed');
      } else if (!entry.isIntersecting) {
        entry.target.classList.remove('is-revealed');
      }
    }
  }, {threshold:[0,.06]});

  function register(node) {
    if (tracked.has(node)) return;
    tracked.add(node);
    node.classList.add('entry-reveal');
    // A first viewport or direct hash landing stays readable immediately.
    node.classList.toggle('is-revealed', reduced.matches || inViewport(node));
    observer.observe(node);
  }

  function visit(node, callback) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.matches(selector)) callback(node);
    node.querySelectorAll(selector).forEach(callback);
  }

  main.querySelectorAll(selector).forEach(register);
  new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) visit(node, register);
      for (const node of record.removedNodes) {
        if (main.contains(node)) continue;
        visit(node, removed => {
          observer.unobserve(removed);
          tracked.delete(removed);
        });
      }
    }
  }).observe(main, {childList:true, subtree:true});

  reduced.addEventListener('change', () => {
    for (const node of tracked) {
      node.classList.toggle('is-revealed', reduced.matches || inViewport(node));
    }
  });
})();
