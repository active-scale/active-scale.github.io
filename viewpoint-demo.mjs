import * as T from './vendor/three.module.min.js';
import {createAmp, defaults} from './assets/robot-models/amp.mjs?v=20261104k';

const degrees = Math.PI / 180;
const vector = (...values) => new T.Vector3(...values);
const finish = color => new T.MeshStandardMaterial({color, roughness: .58, metalness: .12});

function box(width, height, depth, material, x, y, z) {
  const mesh = new T.Mesh(new T.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  return mesh;
}

function environment() {
  const scene = new T.Scene();
  scene.background = new T.Color(0xe8e6e0);
  scene.fog = new T.Fog(0xe8e6e0, 5, 13);
  scene.add(new T.HemisphereLight(0xf7f7f4, 0xb2aaa0, 1.9));
  const key = new T.DirectionalLight(0xfff7e8, 2.15);
  key.position.set(-3, 7, 5);
  scene.add(key);
  const floor = new T.Mesh(new T.PlaneGeometry(40, 40), new T.MeshBasicMaterial({color: 0xd9d7d0}));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -.019;
  scene.add(floor);
  const grid = new T.GridHelper(24, 48, 0xb0aea6, 0xc2c0b8);
  grid.position.y = -.012;
  scene.add(grid);
  const top = finish(0xa68158);
  const frame = finish(0x4d565b);
  scene.add(box(2.2, .065, 1.4, top, .25, .85, -1.15));
  for (const x of [-.73, 1.23]) {
    for (const z of [-1.74, -.56]) scene.add(box(.055, .82, .055, frame, x, .41, z));
  }
  return scene;
}

function solveGoal(rig, calibration, kind, target) {
  const center = {...calibration.joints.center};
  center.joint1 = (center.joint1 ?? 0) + (kind === 'occlusion' ? -40 : -25);
  center.joint2 = (center.joint2 ?? 0) + (kind === 'occlusion' ? 20 : 0);
  const goal = {...calibration, joints: {...calibration.joints, center}};
  rig.pose(goal);
  const arm = rig.arms.center;
  // Solve only once. Playback interpolates bounded joint positions from the saved rest pose.
  for (let pass = 0; pass < 18; pass++) {
    for (const id of ['joint5', 'joint4']) {
      const joint = arm.joints[id];
      const rotation = joint.frame.getWorldQuaternion(new T.Quaternion());
      const axis = joint.axis.clone().applyQuaternion(rotation);
      const position = arm.optical.getWorldPosition(vector());
      const forward = arm.optical.getWorldDirection(vector()).projectOnPlane(axis).normalize();
      const desired = target.clone().sub(position).projectOnPlane(axis).normalize();
      const delta = Math.atan2(axis.dot(forward.clone().cross(desired)), forward.dot(desired));
      const angle = T.MathUtils.clamp((center[id] ?? 0) * degrees + delta, ...joint.range);
      center[id] = angle / degrees;
      arm.setJoint(id, angle);
    }
  }
  for (const [id, joint] of Object.entries(arm.joints)) {
    if (joint.type !== 'slide') center[id] = T.MathUtils.clamp((center[id] ?? 0) * degrees, ...joint.range) / degrees;
  }
  rig.pose(calibration);
  return goal;
}

function targetVisibility(scene, target, eye, wall) {
  const ray = new T.Raycaster();
  const corners = [target.position.clone()];
  for (const x of [-.0575, .0575]) {
    for (const y of [-.065, .065]) {
      for (const z of [-.0575, .0575]) corners.push(target.position.clone().add(vector(x, y, z)));
    }
  }
  let framed = 0;
  let visible = 0;
  for (const point of corners) {
    const clip = point.clone().project(eye);
    if (Math.abs(clip.x) > 1 || Math.abs(clip.y) > 1 || clip.z < -1 || clip.z > 1) continue;
    framed++;
    const direction = point.clone().sub(eye.position);
    ray.set(eye.position, direction.clone().normalize());
    ray.far = direction.length() - .001;
    if (!wall || !ray.intersectObject(wall).length) visible++;
  }
  if (visible === corners.length) return 'Target in view';
  if (visible) return 'Target partly visible';
  return framed ? 'Target occluded' : 'Target outside the view';
}

async function createView(card, kind, calibration) {
  const canvas = card.querySelector('canvas');
  const renderer = new T.WebGLRenderer({canvas, antialias: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const scene = environment();
  const observer = new T.PerspectiveCamera(38, 1, .05, 40);
  observer.layers.enable(1);
  const eye = new T.PerspectiveCamera(52.4, 4/3, .035, 30);
  const rig = await createAmp();
  rig.root.rotation.y = Math.PI / 2;
  rig.pose(calibration);
  const target = box(.115, .13, .115, finish(0x639653), kind === 'occlusion' ? 0 : .9, .948, kind === 'occlusion' ? -1.66 : -1.3);
  const wall = kind === 'occlusion'
    ? box(.070, .63, .025, finish(0x586872), 0, 1.195, -.64)
    : null;
  if (wall) scene.add(wall);
  scene.add(target, rig.root);
  for (const helper of rig.frusta()) {
    helper.layers.set(1);
    scene.add(helper);
  }
  let goal = solveGoal(rig, calibration, kind, target.position);
  const status = card.querySelector('output');
  const insetLabel = card.querySelector('.vp-inset-label');
  let start = structuredClone(calibration.joints.center);
  const aimFrame = rig.arms.center.optical;
  let current = {...calibration, joints: {...calibration.joints, center: {...start}}};

  function draw(progress, orbit) {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    observer.aspect = width / height;
    observer.updateProjectionMatrix();
    const radius = 4.55 * Math.max(1, .85 / observer.aspect);
    observer.position.set(radius * Math.sin(.68 + orbit), 2.7, radius * Math.cos(.68 + orbit));
    observer.lookAt(.18, .77, -.6);
    const smooth = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
    for (const id of Object.keys(goal.joints.center)) {
      current.joints.center[id] = T.MathUtils.lerp(start[id] ?? 0, goal.joints.center[id], smooth);
    }
    rig.pose(current);
    aimFrame.getWorldPosition(eye.position);
    aimFrame.getWorldQuaternion(eye.quaternion);
    eye.updateProjectionMatrix();
    eye.updateMatrixWorld(true);
    scene.updateMatrixWorld(true);
    const nextStatus = targetVisibility(scene, target, eye, wall);
    if (status.textContent !== nextStatus) status.textContent = nextStatus;
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, width, height);
    renderer.render(scene, observer);
    const insetWidth = Math.round(width * .40);
    const insetHeight = Math.round(insetWidth / eye.aspect);
    insetLabel.style.bottom = insetHeight + 13 + 'px';
    renderer.setScissorTest(true);
    renderer.setScissor(width - insetWidth - 10, 10, insetWidth, insetHeight);
    renderer.setViewport(width - insetWidth - 10, 10, insetWidth, insetHeight);
    renderer.render(scene, eye);
    renderer.setScissorTest(false);
  }
  function calibrate(next) {
    calibration = next;
    start = structuredClone(next.joints.center);
    goal = solveGoal(rig, next, kind, target.position);
    current = {...next, joints: {...next.joints, center: {...start}}};
  }
  return {draw, canvas, calibrate};
}

export function initViewpointDemo() {
  const mount = document.getElementById('viewpoint-demo');
  if (!mount) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./viewpoint-demo.css?v=20261104k', import.meta.url).href;
  document.head.append(link);
  mount.innerHTML = `
    <div class="vp-pair">
      <article class="vp-case">
        <div class="vp-case-title"><h4>Occlusion-Driven Manipulation</h4><p>Move the camera to reveal a hidden target.</p></div>
        <div class="vp-viewport"><canvas aria-label="AMP reveals a target hidden by an occluder"></canvas><output aria-live="polite"></output><span class="vp-inset-label">Camera view</span></div>
      </article>
      <article class="vp-case">
        <div class="vp-case-title"><h4>Active Search and Localization</h4><p>Turn toward a target outside the initial view.</p></div>
        <div class="vp-viewport"><canvas aria-label="AMP looks toward a target outside the initial view"></canvas><output aria-live="polite"></output><span class="vp-inset-label">Camera view</span></div>
      </article>
    </div>
    <div class="vp-controls">
      <button type="button" disabled>Loading models…</button>
      <label for="viewpoint-progress">Shared timeline</label>
      <input id="viewpoint-progress" type="range" min="0" max="1000" value="0" aria-label="Shared viewpoint motion timeline">
      <span class="vp-time">Initial pose</span>
    </div>
    <p class="vp-note">Illustrative motion from the calibrated initial pose.</p>`;
  const button = mount.querySelector('button');
  const timeline = mount.querySelector('input');
  const time = mount.querySelector('.vp-time');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let views = [], progress = 0, frame = 0, lastTime, orbit = 0, visible = false, initialized = false, autoplay = true;

  function draw() {
    views.forEach(view => view.draw(progress, orbit));
    timeline.value = Math.round(progress * 1000);
    time.textContent = progress === 0 ? 'Initial pose' : progress === 1 ? 'Target view' : Math.round(progress * 100) + '%';
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = undefined;
    button.textContent = progress === 1 ? 'Replay both' : 'Play both';
  }
  function tick(now) {
    if (lastTime !== undefined) progress = Math.min(1, progress + (now - lastTime) / 7000);
    lastTime = now;
    draw();
    if (progress === 1) stop();
    else frame = requestAnimationFrame(tick);
  }
  function play() {
    if (!views.length || frame) return;
    if (progress === 1) progress = 0;
    lastTime = undefined;
    button.textContent = 'Pause both';
    frame = requestAnimationFrame(tick);
  }
  button.addEventListener('click', () => {
    autoplay = false;
    if (frame) stop(); else play();
  });
  timeline.addEventListener('input', () => {
    autoplay = false;
    stop();
    progress = Number(timeline.value) / 1000;
    draw();
  });
  async function initialize() {
    initialized = true;
    try {
      const calibration = structuredClone(defaults);
      views = await Promise.all([...mount.querySelectorAll('.vp-case')].map((card, index) => createView(card, index ? 'search' : 'occlusion', calibration)));
      button.disabled = false;
      stop();
      draw();
      for (const view of views) {
        let drag;
        view.canvas.addEventListener('pointerdown', event => {
          drag = event.clientX;
          view.canvas.setPointerCapture(event.pointerId);
        });
        view.canvas.addEventListener('pointermove', event => {
          if (drag === undefined) return;
          orbit += (event.clientX - drag) * .007;
          drag = event.clientX;
          draw();
        });
        for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) view.canvas.addEventListener(event, () => {drag = undefined;});
        new ResizeObserver(draw).observe(view.canvas);
      }
      if (visible && !reduced.matches) play();
    } catch (error) {
      button.textContent = '3D preview unavailable';
      mount.querySelector('.vp-note').textContent = 'The hardware video above shows the physical system.';
      console.error(error);
    }
  }
  document.addEventListener('amp-calibration', () => {
    if (!views.length) return;
    stop();
    progress = 0;
    const calibration = structuredClone(defaults);
    views.forEach(view => view.calibrate(calibration));
    draw();
  });
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible && !initialized) initialize();
    else if (!visible && frame) stop();
    else if (visible && autoplay && views.length && progress < 1 && !reduced.matches) play();
  }, {threshold: .2});
  observer.observe(mount);
}
