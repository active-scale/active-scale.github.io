import * as T from './vendor/three.module.min.js';
import {createAmp, savedCalibration} from './assets/robot-models/amp.mjs?v=20261103e';
import {recordedJoints, setRecordedOptics} from './recorded-motion.mjs?v=20261103e';
import {createReplayScene} from './replay-scene.mjs?v=20261103e';

const episodes = [
  ['Backpack · episode 128', './assets/replay/backpack-episode-128.json'],
  ['Box · episode 42', './assets/replay/box-episode-42.json'],
];

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
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = new URL('./recorded-replay.css?v=20261103e', import.meta.url).href;
  document.head.append(style);
  const body = document.createElement('div');
  body.className = 'recorded-replay' + (options.compact ? ' recorded-compact' : '');
  body.innerHTML = `
    <div class="recorded-toolbar">
      <label>Demonstration <select aria-label="Recorded demonstration">${episodes.map(([name], index) => `<option value="${index}">${name}</option>`).join('')}</select></label>
      <button type="button" disabled>Loading…</button>
      <label>Speed <select aria-label="Recorded playback speed"><option value=".5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>
      <label>Sim camera <select data-camera aria-label="Simulated camera"><option value="cam_front">Head</option><option value="cam_left">Left wrist</option><option value="cam_right">Right wrist</option></select></label>
    </div>
    <p class="recorded-instruction"></p>
    <div class="recorded-views">
      <canvas aria-label="Recorded ActiveScale joint motion on the AMP preview"></canvas>
      <aside class="recorded-stills"><h5>Initial camera frames · t = 0</h5>
        <figure><img alt="Head camera at the start of the selected recording"><figcaption>Head camera</figcaption></figure>
        <figure><img alt="Left wrist camera at the start of the selected recording"><figcaption>Left wrist</figcaption></figure>
        <figure><img alt="Right wrist camera at the start of the selected recording"><figcaption>Right wrist</figcaption></figure>
      </aside>
    </div>
    <div class="recorded-timeline"><input type="range" value="0" min="0" max="1" step="0.01" aria-label="Recorded demonstration timeline"><output>0.0 s</output></div>
    <p class="recorded-limits" role="status"></p>
    <p class="recorded-note">${options.compact
      ? 'Recorded joint motion at 30 Hz, with an independent timeline. Gripper values run from 0 (closed) to 0.1 (open). Scene objects are omitted in this comparison.'
      : 'Recorded at 30 Hz with 0 = closed and 0.1 = open. The camera view uses recorded optical poses and 640 × 480 intrinsics. Table and backpack placement are adjustable drafts.'}</p>`;
  container.append(body);
  const [episodeSelect, speed] = body.querySelectorAll('select');
  const viewSelect = body.querySelector('[data-camera]');
  if (options.compact) {
    episodeSelect.closest('label').remove();
    viewSelect.closest('label').remove();
  }
  episodeSelect.value = String(options.episodeIndex ?? 0);
  const play = body.querySelector('button');
  const timeline = body.querySelector('input');
  const clock = body.querySelector('output');
  const limits = body.querySelector('.recorded-limits');
  const canvas = body.querySelector('canvas');
  const renderer = new T.WebGLRenderer({canvas, antialias: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const scene = stage();
  const camera = new T.PerspectiveCamera(38, 1, .04, 30);
  const rig = await createAmp();
  scene.add(rig.root);
  const opticalCameras = Object.fromEntries(['cam_front', 'cam_left', 'cam_right'].map(name => {
    const optical = new T.PerspectiveCamera(52.4, 4/3, .02, 30);
    const helper = new T.CameraHelper(optical);
    const orange = new T.Color(0xc86a1b);
    helper.setColors(orange, orange, orange, orange, orange);
    helper.layers.set(1);
    scene.add(helper);
    return [name, {optical, helper}];
  }));
  camera.layers.enable(1);
  const placement = options.compact ? {roll: 0} : createReplayScene(scene, body, () => draw());
  let calibration = savedCalibration();
  let episode, elapsed = 0, animation = 0, lastTime, generation = 0, orbit = .66, tilt = .27;
  const pending = new Map();
  let zoom = 1;

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
    cancelAnimationFrame(animation);
    animation = 0;
    lastTime = undefined;
    play.textContent = episode && elapsed >= (episode.frameCount - 1) / episode.fps ? 'Replay' : 'Play recorded motion';
  }

  function draw() {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const radius = 2.9 / zoom * Math.max(1, .8 / camera.aspect);
    camera.position.set(radius * Math.cos(tilt) * Math.sin(orbit), .85 + radius * Math.sin(tilt), radius * Math.cos(tilt) * Math.cos(orbit));
    camera.lookAt(.1, .82, 0);
    if (episode) {
      const current = recordedJoints(episode, elapsed, calibration);
      let clipped = 0;
      for (const name of ['left', 'right', 'center']) {
        for (let j = 1; j <= 6; j++) {
          const value = current.joints[name]['joint' + j] * Math.PI / 180;
          const [minimum, maximum] = rig.arms[name].joints['joint' + j].range;
          if (value < minimum || value > maximum) clipped++;
        }
      }
      rig.pose(current);
      for (const [name, {optical, helper}] of Object.entries(opticalCameras)) {
        setRecordedOptics(optical, episode, name, elapsed, rig, placement.roll);
        const sourceProjection = optical.projectionMatrix.clone();
        optical.far = .22;
        optical.updateProjectionMatrix();
        helper.update();
        optical.far = 30;
        optical.projectionMatrix.copy(sourceProjection);
        optical.projectionMatrixInverse.copy(sourceProjection).invert();
      }
      timeline.value = elapsed;
      clock.textContent = elapsed.toFixed(1) + ' / ' + ((episode.frameCount - 1) / episode.fps).toFixed(1) + ' s';
      limits.textContent = clipped ? clipped + ' recorded joint angle' + (clipped === 1 ? '' : 's') + ' clipped to the vendor preview limits.' : '';
    }
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, width, height);
    renderer.render(scene, camera);
    if (episode && !options.compact) {
      const insetWidth = Math.round(width * .36), insetHeight = Math.round(insetWidth * .75);
      renderer.setScissorTest(true);
      renderer.setScissor(width - insetWidth - 10, 10, insetWidth, insetHeight);
      renderer.setViewport(width - insetWidth - 10, 10, insetWidth, insetHeight);
      renderer.render(scene, opticalCameras[viewSelect.value].optical);
      renderer.setScissorTest(false);
    }
  }

  function tick(now) {
    if (lastTime !== undefined) elapsed = Math.min((episode.frameCount - 1) / episode.fps, elapsed + (now - lastTime) / 1000 * Number(speed.value));
    lastTime = now;
    draw();
    if (elapsed >= (episode.frameCount - 1) / episode.fps) stop();
    else animation = requestAnimationFrame(tick);
  }
  async function choose() {
    stop();
    play.disabled = true;
    play.textContent = 'Loading…';
    const currentGeneration = ++generation;
    try {
      const data = await loadData(Number(episodeSelect.value));
      if (currentGeneration !== generation) return;
      if (data.armOrder?.join(',') !== 'left,right,mid' || !Number.isFinite(data.fps) || data.fps <= 0 || !data.frameCount || data.qpos.length !== data.frameCount || data.qpos.some(row => row.length !== 21 || row.some(value => !Number.isFinite(value)))) throw new Error('Recorded trajectory has an unsupported shape.');
      episode = data;
      placement.visible = !options.compact && Number(episodeSelect.value) === 0;
      const imageBase = episodes[Number(episodeSelect.value)][1].replace('.json', '');
      [...body.querySelectorAll('.recorded-stills img')].forEach((image, index) => {
        image.src = new URL(imageBase + '-cam_' + ['front', 'left', 'right'][index] + '-initial.jpg', import.meta.url).href;
      });
      elapsed = 0;
      timeline.max = (episode.frameCount - 1) / episode.fps;
      body.querySelector('.recorded-instruction').textContent = episode.instruction;
      play.disabled = false;
      stop();
      draw();
    } catch (error) {
      if (currentGeneration !== generation) return;
      play.textContent = 'Recording unavailable';
      limits.textContent = error.message;
    }
  }

  play.addEventListener('click', () => {
    if (!episode) return;
    if (animation) stop();
    else {
      if (elapsed >= (episode.frameCount - 1) / episode.fps) elapsed = 0;
      play.textContent = 'Pause';
      lastTime = undefined;
      animation = requestAnimationFrame(tick);
    }
  });
  episodeSelect.addEventListener('change', choose);
  viewSelect.addEventListener('change', draw);
  document.addEventListener('replay-request', event => {
    if (options.compact) return;
    const index = event.detail?.task === 'Box' ? 1 : 0;
    episodeSelect.value = String(index);
    choose();
  });
  timeline.addEventListener('input', () => {stop(); elapsed = Number(timeline.value); draw();});
  if (container.tagName === 'DETAILS') container.addEventListener('toggle', () => {if (!container.open) stop();});
  document.addEventListener('visibilitychange', () => {if (document.hidden) stop();});
  document.addEventListener('amp-calibration', () => {calibration = savedCalibration(); draw();});
  let drag;
  canvas.addEventListener('pointerdown', event => {
    drag = [event.clientX, event.clientY];
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!drag) return;
    orbit -= (event.clientX - drag[0]) * .008;
    tilt = T.MathUtils.clamp(tilt + (event.clientY - drag[1]) * .006, -.15, 1.1);
    drag = [event.clientX, event.clientY];
    draw();
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, () => {drag = undefined;});
  canvas.addEventListener('wheel', event => {if (!event.ctrlKey) return;event.preventDefault();zoom = T.MathUtils.clamp(zoom * Math.exp(-event.deltaY * .001), .6, 2);draw();},{passive:false});
  new ResizeObserver(draw).observe(canvas);
  await choose();
  return {
    selectEpisode(index) {episodeSelect.value = String(index); return choose();},
    setTime(seconds) {stop(); elapsed = T.MathUtils.clamp(seconds, 0, (episode.frameCount - 1) / episode.fps); draw();},
    pause: stop
  };
}
