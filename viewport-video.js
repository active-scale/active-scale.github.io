(() => {
  'use strict';
  const videos = new Map();
  const speedConfigured = new WeakSet();
  const robotPlaybackRate = 2;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function configureRobotSpeed(video) {
    if (speedConfigured.has(video)) return;
    speedConfigured.add(video);
    const applySpeed = () => {
      video.defaultPlaybackRate = robotPlaybackRate;
      video.playbackRate = robotPlaybackRate;
    };
    applySpeed();
    video.addEventListener('loadedmetadata', applySpeed);
  }
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
    video.loop = !video.hasAttribute('data-auto-sequence');
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
    const selector = 'video[data-scroll-play],video[data-robot-video]';
    const prepare = video => {
      configureRobotSpeed(video);
      if (video.hasAttribute('data-scroll-play')) register(video);
    };
    if (node.matches(selector)) prepare(node);
    node.querySelectorAll(selector).forEach(prepare);
  }
  scan(document.body);
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(scan)))
    .observe(document.body, {childList: true, subtree: true});
  const syncAll = () => videos.forEach((state, video) => sync(video, state));
  document.addEventListener('visibilitychange', syncAll);
  reduced.addEventListener('change', syncAll);
})();
