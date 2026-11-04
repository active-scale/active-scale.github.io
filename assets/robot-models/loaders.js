/**
 * Browser adapters for the manufacturer meshes in this directory.
 * Pass in the same Three.js instance and STLLoader used by the renderer.
 */
const assetRoot = new URL('./', import.meta.url);
const definitions = new Map();
const geometryByUrl = new Map();

function definition(filename) {
  if (!definitions.has(filename)) {
    definitions.set(filename, fetch(new URL(filename, assetRoot)).then(response => {
      if (!response.ok) throw new Error('Cannot load ' + filename + ': ' + response.status);
      return response.json();
    }));
  }
  return definitions.get(filename);
}

function geometry(loader, filename) {
  const url = new URL(filename, assetRoot).href;
  if (!geometryByUrl.has(url)) geometryByUrl.set(url, loader.loadAsync(url));
  return geometryByUrl.get(url);
}

function inYUp(THREE, child) {
  const root = new THREE.Group();
  child.rotation.x = -Math.PI / 2;
  root.add(child);
  return root;
}

/** Returns a PiPER group, named Z-up link frames, and a joint setter. */
export async function loadPiper(THREE, STLLoader, options = {}) {
  const spec = await definition('piper.json');
  const loader = new STLLoader();
  const color = options.color ?? '#a794c1';
  const material = new THREE.MeshStandardMaterial({ color, metalness: .35, roughness: .58 });
  const shell = options.shellColor ? new THREE.MeshStandardMaterial({
    color: options.shellColor, metalness: .42, roughness: .43
  }) : material;
  const meshes = await Promise.all(Object.entries(spec.meshes).map(async ([name, filename]) => {
    const finger = name === 'link7' || name === 'link8';
    if ((options.fingers === false && finger) ||
        (options.gripper === false && (finger || name === 'gripper_base'))) {
      return [name, null];
    }
    return [name, await geometry(loader, filename)];
  }));
  const geometries = new Map(meshes);
  const links = {};
  const joints = {};
  function link(node) {
    const mount = new THREE.Group();
    mount.position.fromArray(node.pos);
    const [w, x, y, z] = node.quat;
    mount.quaternion.set(x, y, z, w).normalize();
    mount.name = node.name;
    const moving = new THREE.Group();
    mount.add(moving);
    links[node.name] = moving;
    node.joints.forEach(j => {
      const axis = new THREE.Vector3(...j.axis).normalize();
      joints[j.name] = { frame: moving, axis, ...j };
      joints[j.name].axis = axis;
    });
    for (const name of node.meshes) {
      if (!geometries.get(name)) continue;
      const part = new THREE.Mesh(geometries.get(name), name === 'link2' || name === 'link3' ? shell : material);
      part.castShadow = part.receiveShadow = true;
      moving.add(part);
    }
    node.children.forEach(child => moving.add(link(child)));
    return mount;
  }
  const zUp = link(spec.model);
  const root = options.zUp ? zUp : inYUp(THREE, zUp);
  root.name = 'PiPER';
  function setJoint(name, value) {
    const j = joints[name];
    if (!j || !Number.isFinite(value)) return;
    const bounded = Math.max(j.range[0], Math.min(j.range[1], value));
    if (j.type === 'slide') j.frame.position.copy(j.axis).multiplyScalar(bounded);
    else j.frame.quaternion.setFromAxisAngle(j.axis, bounded);
  }
  return { root, links, joints, setJoint };
}

/** Returns the stock Cobot Magic chassis and frame, with arm mounts in meters. */
export async function loadCobotMagic(THREE, STLLoader, options = {}) {
  const spec = await definition('cobot-magic.json');
  const loader = new STLLoader();
  const zUp = new THREE.Group();
  await Promise.all(spec.parts.map(async (part, i) => {
    const meshFile = options.amp && i === 1 ? 'meshes/amp-frame.stl' : part.mesh;
    const geom = await geometry(loader, meshFile);
    const material = new THREE.MeshStandardMaterial({
      color: i === 0 ? '#39464e' : '#929a9e', metalness: .48, roughness: .58
    });
    const mesh = new THREE.Mesh(geom, material);
    mesh.name = part.name;
    mesh.position.fromArray(part.pos);
    mesh.rotation.set(...part.rpy, 'ZYX');
    mesh.castShadow = mesh.receiveShadow = true;
    zUp.add(mesh);
  }));
  const root = options.zUp ? zUp : inYUp(THREE, zUp);
  root.name = 'Cobot Magic';
  return {root, zUp, mounts: spec.stockFollowerMounts};
}
