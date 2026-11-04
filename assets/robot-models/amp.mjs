import * as T from '../../vendor/three.module.min.js';
import {STLLoader} from '../../vendor/STLLoader.js';
import {loadCobotMagic, loadPiper} from './loaders.js';

const armNames = ['left', 'center', 'right'];
const storageKey = 'activeScale.amp.calibration.v1';
const deg = Math.PI / 180;
export const defaults = {
  yaw: {left: 0, center: 0, right: 0},
  offset: {x: 0, y: 0},
  pillarMm: 300,
  zoom: 1.65,
  joints: {
    left: {joint2: 5},
    center: {joint2: 31, joint3: -39, joint5: 25},
    right: {joint2: 5}
  }
};

export function savedCalibration() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (!saved) return structuredClone(defaults);
    return {
      yaw: {...defaults.yaw, ...saved.yaw},
      offset: {...defaults.offset, ...saved.offset},
      pillarMm: saved.pillarMm ?? defaults.pillarMm,
      zoom: saved.zoom ?? defaults.zoom,
      joints: Object.fromEntries(armNames.map(name => [name, {...defaults.joints[name], ...saved.joints?.[name]}]))
    };
  } catch {
    return structuredClone(defaults);
  }
}

export function persistCalibration(settings) {
  try { localStorage.setItem(storageKey, JSON.stringify(settings)); }
  catch { return false; }
  return true;
}

let cameraGeometry;
export function shortFrustum() {
  const camera = new T.PerspectiveCamera(52.4, 4/3, .022, .22);
  const helper = new T.CameraHelper(camera);
  const amber = new T.Color(0xc86a1b);
  helper.setColors(amber, amber, amber, amber, amber);
  return {camera, helper};
}

export async function createAmp() {
  const piperFinish = {zUp: true, color: '#343b41', shellColor: '#a8b1b7'};
  const [base, left, center, right, cameraMesh] = await Promise.all([
    loadCobotMagic(T, STLLoader, {amp: true}),
    loadPiper(T, STLLoader, piperFinish),
    loadPiper(T, STLLoader, {...piperFinish, fingers: false}),
    loadPiper(T, STLLoader, piperFinish),
    cameraGeometry ??= new STLLoader().loadAsync(new URL('./meshes/dabai.stl', import.meta.url).href)
  ]);
  const arms = {left, center, right};
  left.root.position.fromArray(base.mounts.left);
  right.root.position.fromArray(base.mounts.right);
  const post = new T.Mesh(new T.BoxGeometry(.072, .072, 1), new T.MeshStandardMaterial({color: '#a8adb1', metalness: .46, roughness: .48}));
  base.zUp.add(post);
  for (const name of armNames) {
    const arm = arms[name];
    base.zUp.add(arm.root);
    const bracket = new T.Group();
    // Preview offsets based on the hardware photograph. These are unmeasured extrinsics.
    bracket.position.set(name === 'center' ? -.030 : -.052, 0, name === 'center' ? .040 : .026);
    // DaBai looks along its local +X. PiPER's tool axis is link6 +Z.
    bracket.rotation.y = -Math.PI / 2;
    arm.links.link6.add(bracket);
    const mesh = new T.Mesh(cameraMesh, new T.MeshStandardMaterial({color: '#cad1d3', metalness: .37, roughness: .4}));
    bracket.add(mesh);
    const support = new T.Mesh(new T.BoxGeometry(.027, .035, .03), new T.MeshStandardMaterial({color: '#41484b'}));
    support.position.x = -.012;
    bracket.add(support);
    const {camera, helper} = shortFrustum();
    camera.position.x = .021;
    camera.rotation.y = -Math.PI / 2;
    camera.rotateZ(-Math.PI / 2);
    bracket.add(camera);
    arm.optical = camera;
    arm.frustum = helper;
  }
  function pose(settings) {
    const height = settings.pillarMm / 1000;
    const x = .177 + settings.offset.x / 1000;
    const y = settings.offset.y / 1000;
    // Top of the retained stock support (frame-local .650 m + .168 m).
    const mountZ = .818;
    post.position.set(x, y, mountZ + height / 2);
    post.scale.z = height;
    center.root.position.set(x, y, mountZ + height);
    for (const name of armNames) {
      const arm = arms[name];
      arm.root.rotation.z = settings.yaw[name] * deg;
      for (const [id, joint] of Object.entries(arm.joints)) {
        const units = joint.type === 'slide' ? .001 : deg;
        arm.setJoint(id, (settings.joints[name][id] ?? 0) * units);
      }
    }
    base.root.updateMatrixWorld(true);
  }
  function frusta() {
    return armNames.map(name => arms[name].frustum);
  }
  pose(structuredClone(defaults));
  return {root: base.root, arms, pose, frusta};
}
