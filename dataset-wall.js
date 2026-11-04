'use strict';

(() => {
  const mount = document.getElementById('dataset-wall');
  if (!mount) return;
  mount.classList.replace('dataset-wall', 'data-recipe');
  const base = 'assets/dataset-preview/';
  const humanSources = [
    ['EgoLive', 'https://arxiv.org/abs/2604.23570', base + 'egolive-cover.png'],
    ['EgoVerse', 'https://egoverse.ai/', base + 'egoverse-human-ego-poster.jpg', base + 'egoverse-human-ego.mp4'],
    ['EgoSuite', 'https://egosuite100k.lightwheel.ai/', base + 'egosuite-human-ego-poster.jpg', base + 'egosuite-human-ego.mp4'],
  ];
  const robotSources = [
    ['AgiBot World', 'https://agibot-world.com/'],
    ['RoboCOIN', 'https://arxiv.org/abs/2511.17441'],
    ['AMP', '#system'],
  ];
  const stages = [
    ['internet', 'Internet-scale egocentric data', 'Everyday activities offer a scalable source of how people look and act across scenes, objects, and tasks.', 4800],
    ['human', 'From video to head and hand motion', 'We curate EgoLive, EgoVerse, and EgoSuite. Head-camera poses supervise viewpoint changes, while wrist trajectories supervise manipulation.', 8000],
    ['gap', 'Human-only mid-training', 'A pretrained VLA can learn from these signals. In our preliminary human-only trials, downstream grasps became offset, suggesting degradation of pretrained robot control.', 6500],
    ['robot', 'Keep learning from robot demonstrations', 'Robot data supplies action supervision in the robot embodiment as the model adapts to human motion.', 4800],
    ['robot-selected', 'The robot data in our recipe', 'AgiBot World, RoboCOIN, and AMP contribute robot demonstrations. AMP captures coordinated head-camera and bimanual motion.', 5800],
    ['mixed', 'Human–robot mid-training', 'We sample human and robot demonstrations at a 1:1 ratio to learn human active-view priors while retaining robot-aligned action learning.', 8000],
  ];
  const robotIcon = '<svg viewBox="0 0 100 70" aria-hidden="true"><path d="M19 61h25M31 60V40L58 26 76 39M31 40 22 24 44 13"/><circle cx="31" cy="40" r="5"/><circle cx="58" cy="26" r="5"/><path d="m75 35 8 7-8 7"/></svg>';
  mount.innerHTML = `
    <div class="recipe-toolbar"><div class="recipe-progress" aria-hidden="true">${stages.map(() => '<span></span>').join('')}</div><button type="button" class="recipe-play">Play story</button></div>
    <div class="recipe-story" data-stage="internet">
      <div class="recipe-stage-heading"><h3></h3><p aria-live="polite"></p></div>
      <div class="recipe-scenes">
        <div class="recipe-source-side">
          <div class="recipe-layer recipe-net"><div class="recipe-count-label">Internet-scale egocentric video</div><div class="recipe-mosaic recipe-net-mosaic" aria-hidden="true"></div></div>
          <div class="recipe-layer recipe-selected"><div class="recipe-source-cards">${humanSources.map(([name, href, poster, video]) => `<a href="${href}" class="recipe-source-card"><div class="recipe-source-media">${video ? `<video data-source="${video}" poster="${poster}" muted playsinline loop preload="none" aria-label="${name} preview"></video>` : `<img src="${poster}" alt="EgoLive dataset overview" loading="lazy">`}</div><strong>${name} ↗</strong></a>`).join('')}</div><div class="recipe-pose-signals"><span>Head-camera pose</span><span>Left wrist pose</span><span>Right wrist pose</span></div></div>
          <div class="recipe-layer recipe-robot-net"><div class="recipe-count-label">Robot demonstrations</div><div class="recipe-mosaic recipe-robot-mosaic" aria-hidden="true"></div></div>
          <div class="recipe-layer recipe-robot-selected"><div class="recipe-source-cards recipe-robot-cards">${robotSources.map(([name, href]) => `<a href="${href}" class="recipe-source-card">${robotIcon}<strong>${name} ↗</strong></a>`).join('')}</div><video class="recipe-amp-video" data-source="assets/trimmed/teleoperation.mp4" poster="assets/trimmed/teleoperation-poster.jpg" muted playsinline loop preload="none" aria-label="AMP human-robot data collection"></video></div>
        </div>
        <div class="recipe-right-side">
          <div class="recipe-layer recipe-scale"><span>Many people</span><span>Many scenes</span><span>Many viewpoints</span><div class="recipe-scale-flow" aria-hidden="true">→</div><strong>Head + hand motion</strong></div>
          <div class="recipe-layer recipe-human-motion"><canvas aria-label="Egocentric human demonstration with head and wrist coordinate frames"></canvas><div class="recipe-axes-key"><b>X</b><b>Y</b><b>Z</b><span>Head and wrist frames · Drag to orbit</span></div></div>
          <div class="recipe-layer recipe-gap"><div class="recipe-training-block">Pretrained VLA</div><span class="recipe-data-arrow">↓</span><div class="recipe-training-block">Human pose supervision</div><span class="recipe-data-arrow">↓</span><div class="recipe-offset"><i></i><b></b></div><strong>Embodiment gap</strong><p>Preliminary robot grasp offsets</p></div>
          <div class="recipe-layer recipe-retain"><div class="recipe-training-block">Human motion priors</div><span class="recipe-data-arrow">+</span><div class="recipe-training-block recipe-robot-block">Robot action supervision</div><span class="recipe-data-arrow">↓</span><strong>Co-training recipe</strong></div>
        </div>
        <div class="recipe-layer recipe-final"><div class="recipe-final-input"><strong>Human demonstrations</strong><div class="recipe-final-tags">EgoLive · EgoVerse · EgoSuite</div></div><div class="recipe-final-flow" aria-hidden="true">→</div><div class="recipe-final-model"><span>1:1 sampling</span><strong>Shared VLA</strong><small>Mixed mid-training</small></div><div class="recipe-final-flow" aria-hidden="true">←</div><div class="recipe-final-input"><strong>Robot demonstrations</strong><div class="recipe-final-tags">AgiBot World · RoboCOIN · AMP</div></div></div>
      </div>
    </div>`;
  const story = mount.querySelector('.recipe-story');
  const title = mount.querySelector('.recipe-stage-heading h3');
  const caption = mount.querySelector('.recipe-stage-heading p');
  const button = mount.querySelector('.recipe-play');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const netMosaic = mount.querySelector('.recipe-net-mosaic');
  const robotMosaic = mount.querySelector('.recipe-robot-mosaic');
  for (let i = 0; i < 56; i++) {
    const tile = document.createElement('div'); tile.className = 'recipe-tile';
    tile.style.setProperty('--tile', i); tile.style.setProperty('--offset', (i % 4) * -11 + 'px');
    const image = document.createElement('img');image.loading = 'lazy';image.alt = '';
    image.src = base + 'net-ego-' + String(i % 28).padStart(2,'0') + '.webp';
    tile.append(image);netMosaic.append(tile);
  }
  const tasks = ['bag', 'drawer', 'table', 'pot', 'box', 'teleoperation'];
  for (let i = 0; i < 36; i++) {
    const tile = document.createElement('div');tile.className = 'recipe-tile';tile.style.setProperty('--tile', i);
    const image = document.createElement('img');image.loading = 'lazy';image.alt = '';
    image.src = 'assets/trimmed/' + tasks[i % tasks.length] + '-poster.jpg';
    image.style.objectPosition = (i % 3) * 50 + '% ' + (Math.floor(i / 6) % 3) * 50 + '%';
    image.style.transform = 'scale(' + (1 + (i % 3) * .15) + ')';
    tile.append(image);robotMosaic.append(tile);
  }
  let index = 0, playing = false, visible = false, started = false, elapsed = 0, lastTime, animation = 0, human;
  let humanLoading;
  function loadHuman() {
    humanLoading ??= import('./data-human.mjs?v=20261103d').then(module => module.initDataHuman(mount.querySelector('.recipe-human-motion canvas'))).then(controller => {human = controller; syncMedia();}).catch(error => {console.warn('Human motion preview unavailable',error);});
  }
  function syncMedia() {
    const kind = stages[index][0];
    human?.setPlaying(visible && playing && kind === 'human' && !reduced.matches);
    for (const video of mount.querySelectorAll('video')) {
      const layer = video.closest('.recipe-layer');
      const shown = layer.classList.contains('recipe-selected') ? ['human','gap'].includes(kind) : kind === 'robot-selected';
      if (visible && playing && shown) {
        if (!video.hasAttribute('src')) video.src = video.dataset.source;
        video.play().catch(() => {});
      } else video.pause();
    }
  }
  function render() {
    const [kind, heading, description] = stages[index];
    story.dataset.stage = kind;
    title.textContent = heading;caption.textContent = description;
    [...mount.querySelector('.recipe-progress').children].forEach((step,i) => step.classList.toggle('is-current',i === index));
    button.textContent = reduced.matches ? (index === stages.length-1 ? 'Restart story' : 'Next scene') : playing ? 'Pause story' : index === stages.length-1 ? 'Replay story' : 'Play story';
    if (['human','gap'].includes(kind) && visible) loadHuman();
    syncMedia();
  }
  function pause() {playing = false;cancelAnimationFrame(animation);lastTime = undefined;render();}
  function tick(now) {
    if(lastTime !== undefined) elapsed += now-lastTime;
    lastTime = now;
    if(elapsed >= stages[index][3]) {
      if(index === stages.length-1){pause();return;}
      index++;elapsed = 0;render();
    }
    animation = requestAnimationFrame(tick);
  }
  function play() {
    started = true;
    if(index === stages.length-1){index=0;elapsed=0;}
    playing = true;lastTime=undefined;render();animation=requestAnimationFrame(tick);
  }
  button.addEventListener('click',() => {
    if(reduced.matches){index=(index+1)%stages.length;elapsed=0;render();}
    else if(playing) pause();else play();
  });
  new IntersectionObserver(([entry]) => {
    visible=entry.isIntersecting;
    if(visible && !started && !reduced.matches) play();
    else if(!visible && playing) pause();
    if(visible)loadHuman();
    syncMedia();
  },{threshold:.2}).observe(mount);
  reduced.addEventListener('change',pause);
  document.addEventListener('visibilitychange',()=>{if(document.hidden && playing)pause();});
  render();
})();
