(() => {
  'use strict';
  function registerRanges(container) {
    if (container.nodeType !== Node.ELEMENT_NODE) return;
    if (container.matches('input[type="range"]')) container.classList.add('robot-timeline');
    container.querySelectorAll('input[type="range"]').forEach(range => range.classList.add('robot-timeline'));
  }

  registerRanges(document.body);
  new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) registerRanges(node);
    }
  }).observe(document.body, {childList:true, subtree:true});
})();
