import * as T from './vendor/three.module.min.js';
import {STLLoader} from './vendor/STLLoader.js';
import {loadCobotMagic, loadPiper} from './assets/robot-models/loaders.js';
import {mastSpec, createMast} from './assets/robot-models/mast-spec.mjs?v=20261104slots1';
import {defaults} from './assets/robot-models/amp.mjs?v=20261104slots1';

const silhouettes = [
  '<path d="M58 133h73l11 12v21H45v-21z" fill="#35434a"/><path d="M65 67h59l12 67H53z" fill="#9ca9ad"/><path d="M78 79H55V61l-9-17-17-6m78 42h25V59l12-17 14-6" fill="none" stroke="#39494d" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M94 67V26" stroke="#8d9a9f" stroke-width="6"/><rect x="81" y="15" width="31" height="18" rx="2" fill="#46555b"/>',
  '<ellipse cx="73" cy="153" rx="25" ry="9" fill="#3e4c50"/><path d="M73 145V109l-24-38 58-30 42 24" fill="none" stroke="#8a999e" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/><circle cx="73" cy="111" r="11" fill="#3b484e"/><circle cx="49" cy="71" r="11" fill="#3b484e"/><circle cx="108" cy="42" r="10" fill="#3b484e"/><path d="m142 60 19 10" stroke="#39464c" stroke-width="13"/>',
  '<path d="m76 25 18-8 24 8-19 9z" fill="#ced6d9"/><path d="m76 25 23 9v133l-23-10z" fill="#9caab0"/><path d="m99 34 19-9v132l-19 10z" fill="#64757d"/><path d="m83 32 0 125m8-121 0 125m15-130 0 128m7-132 0 129" fill="none" stroke="#47565e" stroke-width="3"/><path d="m85 33 0 125m8-120 0 124m15-132 0 129m7-133 0 129" fill="none" stroke="#d9e0e2" stroke-width="1"/>',
];

export function createAmpParts() {
  const panel = document.createElement('section');
  panel.className = 'amp-parts';
  const entries = [
    ['Stock Cobot Magic', 'Mobile base and two arms'],
    ['Extra active camera arm', 'Independent viewpoint control'],
    ['Aluminum extrusion', '100 × 100 × 300 mm'],
  ];
  panel.innerHTML = `
    <h4>AMP components</h4>
    <div class="amp-parts-list">${entries.map(([name, detail], index) => `
      <figure>
        <div class="amp-part-view" aria-hidden="true">
          <svg viewBox="0 0 190 180" focusable="false">${silhouettes[index]}</svg>
          <canvas width="340" height="380" hidden></canvas>
        </div>
        <figcaption><strong>${name}</strong><span>${detail}</span></figcaption>
      </figure>`).join('')}</div>`;
  const stylesheet = new URL('./amp-parts.css?v=20261104card-padding2', import.meta.url).href;
  if (!document.querySelector('link[data-amp-parts]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = stylesheet;
    link.dataset.ampParts = '';
    document.head.append(link);
  }
  renderParts(panel).catch(error => {
    console.warn('AMP component thumbnails unavailable:', error);
  });
  return panel;
}

async function renderParts(panel) {
  const canvases = [...panel.querySelectorAll('canvas')];
  const colors = {color: '#38464d', shellColor: '#abb6bb'};
  const [stock, left, right, extra] = await Promise.all([
    loadCobotMagic(T, STLLoader),
    loadPiper(T, STLLoader, {...colors, zUp: true}),
    loadPiper(T, STLLoader, {...colors, zUp: true}),
    loadPiper(T, STLLoader, {...colors, fingers: false}),
  ]);
  for (const [side, arm] of [['left', left], ['right', right]]) {
    arm.root.position.fromArray(stock.mounts[side]);
    arm.root.rotation.z = defaults.yaw[side] * Math.PI / 180;
    for (const [name, joint] of Object.entries(arm.joints)) {
      const value = defaults.joints[side][name] ?? 0;
      arm.setJoint(name, value * (joint.type === 'slide' ? .001 : Math.PI / 180));
    }
    stock.zUp.add(arm.root);
  }
  extra.setJoint('joint2', .54);
  extra.setJoint('joint3', -.68);
  extra.setJoint('joint5', .44);
  const mast = createMast(T);
  mast.rotation.x = -Math.PI / 2;
  mast.position.y = mastSpec.defaultHeight / 2;
  const renderer = new T.WebGLRenderer({antialias: true, alpha: true});
  const views = [stock.root, extra.root, mast].map((model, index) => thumbnailView(model, canvases[index]));
  renderer.setScissorTest(true);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false, frame = 0, lastTime, lastRender, angle = 0;

  function render() {
    for (const {scene, pivot, camera, canvas, context} of views) {
      if (!context) continue;
      pivot.rotation.y = angle;
      renderer.setViewport(0, 0, canvas.width, canvas.height);
      renderer.setScissor(0, 0, canvas.width, canvas.height);
      renderer.render(scene, camera);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(renderer.domElement, 0, renderer.domElement.height - canvas.height,
        canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
      canvas.hidden = false;
      canvas.previousElementSibling.setAttribute('hidden', '');
    }
  }
  function resize() {
    const density = Math.min(devicePixelRatio || 1, 1.5);
    for (const view of views) {
      const box = view.canvas.parentElement;
      const width = Math.max(1, Math.round(box.clientWidth * density));
      const height = Math.max(1, Math.round(box.clientHeight * density));
      if (!box.clientWidth || !box.clientHeight) continue;
      if (view.canvas.width !== width) view.canvas.width = width;
      if (view.canvas.height !== height) view.canvas.height = height;
      view.fit(width / height);
    }
    renderer.setSize(Math.max(...views.map(view => view.canvas.width)),
      Math.max(...views.map(view => view.canvas.height)), false);
    render();
  }
  function canAnimate() {
    return visible && panel.isConnected && !document.hidden && !reduced.matches;
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = lastRender = undefined;
  }
  function tick(now) {
    frame = 0;
    if (!canAnimate()) {stop(); return;}
    if (lastTime !== undefined) angle = (angle + (now - lastTime) * Math.PI / 30000) % (Math.PI * 2);
    lastTime = now;
    if (lastRender === undefined || now - lastRender >= 1000 / 24) {
      render();
      lastRender = now;
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (!canAnimate()) stop();
    else if (!frame) frame = requestAnimationFrame(tick);
  }
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  observer.observe(panel);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  const sizes = new ResizeObserver(resize);
  views.forEach(view => sizes.observe(view.canvas.parentElement));
  resize();
}

function thumbnailView(model, canvas) {
  const bounds = new T.Box3().setFromObject(model, true);
  const center = bounds.getCenter(new T.Vector3());
  const size = bounds.getSize(new T.Vector3());
  model.position.sub(center);
  const pivot = new T.Group();
  pivot.add(model);

  const scene = new T.Scene();
  const hemi = new T.HemisphereLight(0xf9fcff, 0x8d9696, 2.7);
  const key = new T.DirectionalLight(0xfff7e7, 2.2);
  key.position.set(-3, 6, 4);
  scene.add(pivot, hemi, key);

  const camera = new T.OrthographicCamera(-1, 1, 1, -1, .01, 30);
  const direction = new T.Vector3(2.8, 1.6, 3.9).normalize();
  camera.position.copy(direction).multiplyScalar(5);
  camera.lookAt(0, 0, 0);

  // A fixed cylinder encloses every yaw angle, so cards never zoom or recenter.
  const radius = Math.hypot(size.x, size.z) / 2;
  const projectedHeight = size.y * Math.hypot(direction.x, direction.z) + 2 * radius * Math.abs(direction.y);
  function fit(aspect) {
    const halfHeight = Math.max(projectedHeight, 2 * radius / aspect) * .54;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.updateProjectionMatrix();
  }
  fit(canvas.width / canvas.height);
  return {scene, pivot, camera, canvas, fit, context: canvas.getContext('2d')};
}
