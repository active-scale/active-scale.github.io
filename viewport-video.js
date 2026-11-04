(() => {
  'use strict';
  const videos = new Map();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function sync(video, state) {
    if (state.visible && !document.hidden && !state.userPaused && !reduced.matches) {
      video.play().catch(() => {});
    } else if (!video.paused) {
      state.automaticPause = true;
      video.pause();
    }
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const state = videos.get(entry.target);
      state.visible = entry.isIntersecting && entry.intersectionRatio >= .35;
      if (!state.visible) state.userPaused = false;
      sync(entry.target, state);
    }
  }, {threshold: [0, .35]});
  function register(video) {
    if (videos.has(video)) return;
    const state = {visible: false, userPaused: false, automaticPause: false};
    videos.set(video, state);
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.addEventListener('pause', () => {
      if (state.automaticPause) state.automaticPause = false;
      else if (state.visible && !document.hidden && !video.ended) state.userPaused = true;
    });
    video.addEventListener('play', () => {state.userPaused = false;});
    video.addEventListener('emptied', () => {state.userPaused = false;});
    video.addEventListener('loadeddata', () => sync(video, state));
    observer.observe(video);
  }
  function scan(node) {
    if (node.nodeType !== 1) return;
    if (node.matches('video[data-scroll-play]')) register(node);
    node.querySelectorAll('video[data-scroll-play]').forEach(register);
  }
  scan(document.body);
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(scan)))
    .observe(document.body, {childList: true, subtree: true});
  const syncAll = () => videos.forEach((state, video) => sync(video, state));
  document.addEventListener('visibilitychange', syncAll);
  reduced.addEventListener('change', syncAll);
})();
