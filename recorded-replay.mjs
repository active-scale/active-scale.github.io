import * as T from './vendor/three.module.min.js';
import {createAmp, defaults} from './assets/robot-models/amp.mjs?v=20261104slots1';
import {recordedJoints, setRecordedOptics} from './recorded-motion.mjs?v=20261104k';
import {createReplayScene} from './replay-scene.mjs?v=20261104controls1';

const episodes = [
  ['Backpack · episode 128', './assets/replay/backpack-episode-128.json'],
  ['Box · episode 42', './assets/replay/box-episode-42.json'],
  ['Pot · episode 38', './assets/replay/pot-episode-38.json'],
];
const cameraNames = ['cam_front', 'cam_left', 'cam_right'];
const playbackRate = 1.5;

function applyPlaybackRate(video) {
  video.defaultPlaybackRate = playbackRate;
  video.playbackRate = playbackRate;
}

function stage() {
  const scene = new T.Scene();
  scene.background = new T.Color(0xe8e6e0);
  scene.fog = new T.Fog(0xe8e6e0, 5, 12);
  scene.add(new T.HemisphereLight(0xffffff, 0x9c9d94, 2));
  const light = new T.DirectionalLight(0xfff5e7, 2.2);
  light.position.set(-3, 6, 4);
  scene.add(light);
  const floor = new T.Mesh(new T.PlaneGeometry(30, 30), new T.MeshBasicMaterial({color: 0xd9d7d0}));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -.02;
  const grid = new T.GridHelper(20, 40, 0xb0aea6, 0xc2c0b8);
  grid.position.y = -.015;
  scene.add(floor, grid);
  return scene;
}

export async function initRecordedReplay(container, options = {}) {
  if (!document.querySelector('[data-recorded-style]')) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.dataset.recordedStyle = '';
    style.href = new URL('./recorded-replay.css?v=20261104controls1', import.meta.url).href;
    document.head.append(style);
  }
  const body = document.createElement('div');
  body.className = 'recorded-replay' + (options.compact ? ' recorded-compact' : '');
  body.innerHTML = `
    <div class="recorded-toolbar">
      <button type="button" disabled>Loading…</button>
    </div>
    <p class="recorded-instruction"></p>
    <div class="recorded-views">
      <canvas aria-label="AMP replay of recorded joint and camera trajectories"></canvas>
      <aside class="recorded-cameras" aria-label="Three recorded camera streams">
        <figure><video muted playsinline preload="metadata" aria-label="Recorded head camera"></video><figcaption>Head camera</figcaption></figure>
        <figure><video muted playsinline preload="metadata" aria-label="Recorded left wrist camera"></video><figcaption>Left wrist</figcaption></figure>
        <figure><video muted playsinline preload="metadata" aria-label="Recorded right wrist camera"></video><figcaption>Right wrist</figcaption></figure>
      </aside>
    </div>
    <div class="recorded-timeline"><input type="range" value="0" min="0" max="1" step="0.01" aria-label="Recorded demonstration timeline"><output>0.0 s</output></div>
    <p class="recorded-limits" role="status"></p>
    <p class="recorded-note">The same 30 Hz demonstration drives the robot and all three camera videos. Table, shelf and pot placement illustrate the task.</p>`;
  container.append(body);
  const toolbar = body.querySelector('.recorded-toolbar');
  const play = toolbar.querySelector('button');
  if (options.controlsMount && !options.compact) options.controlsMount.append(toolbar);
  const timeline = body.querySelector('input');
  const clock = body.querySelector('output');
  const limits = body.querySelector('.recorded-limits');
  const canvas = body.querySelector('canvas');
  const videos = [...body.querySelectorAll('video')];
  const renderer = new T.WebGLRenderer({canvas, antialias: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const scene = stage();
  const camera = new T.PerspectiveCamera(38, 1, .04, 30);
  const rig = await createAmp();
  scene.add(rig.root);
  const opticalCameras = Object.fromEntries(cameraNames.map(name => {
    const optical = new T.PerspectiveCamera(52.4, 4/3, .02, 30);
    const helper = new T.CameraHelper(optical);
    const orange = new T.Color(0xc86a1b);
    helper.setColors(orange, orange, orange, orange, orange);
    scene.add(helper);
    return [name, {optical, helper}];
  }));
  const placement = createReplayScene(scene);
  const calibration = structuredClone(defaults);
  let episode, elapsed = 0, animation = 0, generation = 0, orbit = .77, tilt = .31, zoom = 1;
  let hasVideo = false, playing = false, inView = false, userPaused = false, starting = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pending = new Map();
  const duration = () => (episode.frameCount - 1) / episode.fps;

  function loadData(index) {
    if (!pending.has(index)) {
      pending.set(index, fetch(new URL(episodes[index][1], import.meta.url)).then(response => {
        if (!response.ok) throw new Error('Recorded trajectory could not load.');
        return response.json();
      }));
    }
    return pending.get(index);
  }

  function stop() {
    playing = false;
    cancelAnimationFrame(animation);
    animation = 0;
    videos.forEach(video => video.pause());
    play.textContent = episode && elapsed >= duration() ? 'Replay' : 'Play demonstration';
  }

  let renderedWidth = 0, renderedHeight = 0;
  function draw() {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    if (width !== renderedWidth || height !== renderedHeight) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderedWidth = width;renderedHeight = height;
    }
    const radius = 3.45 / zoom * Math.max(1, .8 / camera.aspect);
    camera.position.set(.30 + radius * Math.cos(tilt) * Math.sin(orbit), .78 + radius * Math.sin(tilt), radius * Math.cos(tilt) * Math.cos(orbit));
    camera.lookAt(.30, .78, -.10);
    if (episode) {
      const current = recordedJoints(episode, elapsed, calibration);
      let clipped = 0;
      for (const name of ['left', 'right', 'center']) for (let index = 1; index <= 6; index++) {
        const value = current.joints[name]['joint' + index] * Math.PI / 180;
        const [minimum, maximum] = rig.arms[name].joints['joint' + index].range;
        if (value < minimum - .02 || value > maximum + .02) clipped++;
      }
      limits.textContent = clipped ? 'Some recorded angles exceed the stock model limits in this preview.' : '';
      rig.pose(current);
      for (const [name, {optical, helper}] of Object.entries(opticalCameras)) {
        setRecordedOptics(optical, episode, name, elapsed, rig, 0);
        const projection = optical.projectionMatrix.clone();
        const near = optical.near, far = .17;
        optical.projectionMatrix.elements[10] = -(far + near) / (far - near);
        optical.projectionMatrix.elements[14] = -2 * far * near / (far - near);
        optical.projectionMatrixInverse.copy(optical.projectionMatrix).invert();
        helper.update();
        optical.projectionMatrix.copy(projection);
        optical.projectionMatrixInverse.copy(projection).invert();
      }
      placement.update(elapsed, episode, rig);
      timeline.value = elapsed;
      clock.textContent = elapsed.toFixed(1) + ' / ' + duration().toFixed(1) + ' s';
    }
    renderer.render(scene, camera);
  }

  function seek(seconds) {
    elapsed = T.MathUtils.clamp(seconds, 0, duration());
    if (hasVideo) videos.forEach(video => {video.currentTime = elapsed;});
    if (!playing) play.textContent = elapsed >= duration() ? 'Replay' : 'Play demonstration';
    draw();
  }

  let lastTime, lastDrawTime;
  const lastCorrection = new WeakMap();
  function tick(now) {
    if (!playing) return;
    if (hasVideo) {
      elapsed = Math.min(duration(), videos[0].currentTime);
      for (const video of videos.slice(1)) {
        // Repeated small seeks can keep a camera stream waiting for decoded frames.
        if (!video.seeking && video.readyState >= 2 &&
            now - (lastCorrection.get(video) ?? -Infinity) >= 1000 &&
            Math.abs(video.currentTime - elapsed) > .25) {
          video.currentTime = elapsed;
          lastCorrection.set(video, now);
        }
      }
    } else if (lastTime !== undefined) {
      elapsed = Math.min(duration(), elapsed + (now-lastTime) / 1000 * playbackRate);
    }
    lastTime = now;
    const finished = elapsed >= duration() || (hasVideo && videos[0].ended);
    if (finished || lastDrawTime === undefined || now - lastDrawTime >= 1000 / 30) {
      draw();lastDrawTime = now;
    }
    if (finished) stop();
    else animation = requestAnimationFrame(tick);
  }

  function mediaReady(video, src, poster) {
    return new Promise((resolve, reject) => {
      video.onloadedmetadata = () => applyPlaybackRate(video);
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error('The recorded camera video could not load.'));
      video.preload = 'auto';
      video.src = src;
      video.poster = poster;
      video.load();
    });
  }

  async function choose(index = 2) {
    stop();play.disabled = true;play.textContent = 'Loading…';
    const currentGeneration = ++generation;
    try {
      const data = await loadData(index);
      if (currentGeneration !== generation) return;
      if (data.armOrder?.join(',') !== 'left,right,mid' || data.qpos.length !== data.frameCount || data.qpos.some(row => row.length !== 21 || row.some(value => !Number.isFinite(value)))) throw new Error('Recorded trajectory has an unsupported shape.');
      episode = data;
      hasVideo = index === 2;
      placement.visible = index === 2;
      body.querySelector('.recorded-cameras').hidden = !hasVideo;
      body.querySelector('.recorded-note').textContent = hasVideo
        ? 'Recorded motion and camera views share one timeline. Scene placement is illustrative.'
        : 'Recorded joint trajectory at 30 Hz. This older excerpt has no camera videos.';
      elapsed = 0;timeline.max = duration();
      body.querySelector('.recorded-instruction').textContent = episode.instruction;
      draw();
      if (hasVideo) {
        const base = episodes[index][1].replace('.json', '');
        await Promise.all(videos.map((video, i) => mediaReady(
          video, new URL(base + '-' + cameraNames[i] + '.mp4', import.meta.url).href,
          new URL(base + '-' + cameraNames[i] + '-poster.jpg', import.meta.url).href
        )));
        if (currentGeneration !== generation) return;
      }
      play.disabled = false;limits.textContent = '';stop();
      // Loading the models and videos can change this section's height after
      // its first intersection entry. Re-check its final visible area.
      const bounds = body.getBoundingClientRect();
      const visibleHeight = Math.max(0, Math.min(bounds.bottom, innerHeight) - Math.max(bounds.top, 0));
      inView = bounds.height > 0 && visibleHeight / bounds.height >= .25;
      if (inView && !userPaused && !reduced.matches) startPlayback();
    } catch (error) {
      if (currentGeneration !== generation) return;
      play.textContent = 'Recording unavailable';limits.textContent = error.message;
    }
  }

  async function startPlayback() {
    if (!episode || play.disabled || playing || starting || document.hidden) return;
    starting = true;
    try {
      if (elapsed >= duration()) seek(0);
      if (hasVideo) {
        for (const video of videos) {applyPlaybackRate(video);video.currentTime = elapsed;}
        const results = await Promise.allSettled(videos.map(video => video.play()));
        if (results.some(result => result.status === 'rejected')) {stop();return;}
      }
      if (!inView || document.hidden || userPaused) {stop();return;}
      playing = true;play.textContent = 'Pause';lastTime = lastDrawTime = undefined;
      animation = requestAnimationFrame(tick);
    } finally {starting = false;}
  }
  play.addEventListener('click', () => {
    if (playing) {userPaused = true;stop();}
    else {userPaused = false;startPlayback();}
  });
  timeline.addEventListener('input', () => {userPaused=true;stop();seek(Number(timeline.value));});
  if (container.tagName === 'DETAILS') container.addEventListener('toggle', () => {if (!container.open) stop();});
  document.addEventListener('visibilitychange', () => {if(document.hidden)stop();else if(inView&&!userPaused&&!reduced.matches)startPlayback();});
  new IntersectionObserver(([entry]) => {
    inView=entry.isIntersecting&&entry.intersectionRatio>=.25;
    if(inView&&!userPaused&&!reduced.matches)startPlayback();
    else if(!inView){userPaused=false;stop();}
  },{threshold:[0,.25]}).observe(body);
  let drag;
  canvas.addEventListener('pointerdown', event => {drag=[event.clientX,event.clientY];canvas.setPointerCapture(event.pointerId);});
  canvas.addEventListener('pointermove', event => {
    if (!drag) return;
    orbit-=(event.clientX-drag[0])*.008;
    tilt=T.MathUtils.clamp(tilt+(event.clientY-drag[1])*.006,-.15,1.1);
    drag=[event.clientX,event.clientY];draw();
  });
  for (const event of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(event,()=>{drag=undefined;});
  canvas.addEventListener('wheel',event=>{if(!event.ctrlKey)return;event.preventDefault();zoom=T.MathUtils.clamp(zoom*Math.exp(-event.deltaY*.001),.6,2);draw();},{passive:false});
  new ResizeObserver(draw).observe(canvas);
  await choose(options.episodeIndex ?? 2);
  return {
    selectEpisode: choose,
    setTime(seconds) {stop();if(episode)seek(seconds);},
    pause: stop,
  };
}
