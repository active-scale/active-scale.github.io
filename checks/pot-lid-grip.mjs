import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

// Read the production meshes and replay without a browser or a second motion representation.
globalThis.fetch = async request => new Response(await fs.readFile(new URL(request.url ?? request)));
globalThis.ProgressEvent = Event;
const T = await import('../vendor/three.module.min.js');
const {createAmp, defaults} = await import('../assets/robot-models/amp.mjs');
const {recordedJoints} = await import('../recorded-motion.mjs');
const {createReplayScene} = await import('../replay-scene.mjs');
const episode = JSON.parse(await fs.readFile(new URL('../assets/replay/pot-episode-38.json', import.meta.url)));
const digest = () => createHash('sha256').update(JSON.stringify(episode.qpos)).digest('hex');
const original = digest();
const rig = await createAmp(), scene = new T.Scene();
scene.add(rig.root);
const placement = createReplayScene(scene);
const lid = scene.getObjectByName('Lid'), knob = scene.getObjectByName('Lid knob');
const fingers = ['link7', 'link8'].map(name => rig.arms.right.links[name].children.find(object => object.isMesh));
for (const mesh of [...fingers, knob]) {
  mesh.material = mesh.material.clone();
  mesh.material.side = T.DoubleSide;
}
const raycaster = new T.Raycaster();
raycaster.near = 0;
raycaster.far = .1;
const origin = new T.Vector3(), direction = new T.Vector3();
let minimum = Infinity, maximum = -Infinity, samples = 0, maximumGripOverlap = 0;
function boundsInTool(mesh, inverseTool) {
  const transform = inverseTool.clone().multiply(mesh.matrixWorld);
  const positions = mesh.geometry.attributes.position;
  const bounds = new T.Box3(), point = new T.Vector3();
  for (let vertex = 0; vertex < positions.count; vertex++) {
    bounds.expandByPoint(point.fromBufferAttribute(positions, vertex).applyMatrix4(transform));
  }
  return bounds;
}
function update(time) {
  rig.pose(recordedJoints(episode, time, defaults));
  const before = rig.arms.right.links.link6.matrixWorld.elements.slice();
  placement.update(time, episode, rig);
  assert.deepEqual(rig.arms.right.links.link6.matrixWorld.elements, before, 'Object update changed the recorded wrist pose');
  scene.updateMatrixWorld(true);
}
// Ray distances compare each real inner finger surface with the knob's actual triangle surface.
for (let frame = 20.1 * 60; frame <= 25.1 * 60; frame++) {
  const time = frame / 60;
  update(time);
  knob.getWorldPosition(origin);
  const rotation = rig.arms.right.links.link6.getWorldQuaternion(new T.Quaternion());
  for (let index = 0; index < fingers.length; index++) {
    direction.set(0, index === 0 ? -1 : 1, 0).applyQuaternion(rotation);
    raycaster.set(origin, direction);
    const fingerHit = raycaster.intersectObject(fingers[index], false)[0];
    const knobHit = raycaster.intersectObject(knob, false)[0];
    assert(fingerHit, 'Knob center does not project into finger ' + (index + 1) + ' at ' + time);
    assert(knobHit, 'Knob surface missing at ' + time);
    const separation = fingerHit.distance - knobHit.distance;
    minimum = Math.min(minimum, separation);
    maximum = Math.max(maximum, separation);
    assert(Math.abs(separation) < .0005, 'Finger/knob separation exceeds 0.5 mm at ' + time);
  }
  const inverseTool = rig.arms.right.links.link6.matrixWorld.clone().invert();
  const knobInTool = boundsInTool(knob, inverseTool);
  const negativeFinger = boundsInTool(fingers[0], inverseTool);
  const positiveFinger = boundsInTool(fingers[1], inverseTool);
  const overlap = Math.max(0, negativeFinger.max.y - knobInTool.min.y, knobInTool.max.y - positiveFinger.min.y);
  maximumGripOverlap = Math.max(maximumGripOverlap, overlap);
  assert(overlap < .0005, 'Expected finger/knob contact exceeds 0.5 mm overlap at ' + time);
  samples++;
}
for (const time of [20.1, 25.1, 25.42, 25.8]) {
  update(time - .0001);
  const position = lid.position.clone(), rotation = lid.quaternion.clone();
  update(time + .0001);
  assert(position.distanceTo(lid.position) < .0005, 'Lid position jumps at ' + time);
  assert(rotation.angleTo(lid.quaternion) < .001, 'Lid orientation jumps at ' + time);
}
update(0);
const table = new T.Box3().setFromObject(scene.getObjectByName('Tabletop'));
const initialLid = new T.Box3().setFromObject(lid);
const initialPot = new T.Box3().setFromObject(scene.getObjectByName('Pot'));
assert(Math.abs(initialPot.min.y - table.max.y) < 1e-6, 'The pot is not resting on the table');
const initialSupportGap = initialLid.min.y - table.max.y;
assert(initialSupportGap >= 0 && initialSupportGap <= .0005, 'Initial lid is not resting at the table support');
update(27);
const pot = scene.getObjectByName('Pot');
assert(Math.abs(lid.position.x - pot.position.x) < 1e-8 && Math.abs(lid.position.z - pot.position.z) < 1e-8,
  'Released lid is not centered on the pot');
const rimBounds = new T.Box3().setFromObject(scene.getObjectByName('Pot rim'));
const seatedCrown = new T.Box3().setFromObject(scene.getObjectByName('Lid crown'));
const supportGap = seatedCrown.min.y - rimBounds.max.y;
assert(supportGap >= -1e-6 && supportGap < .0003, 'Released lid penetrates or hovers above the rim');
assert.equal(digest(), original, 'Recorded qpos changed');
console.log(JSON.stringify({samples,from:20.1,to:25.1,contacts:samples * 2,minimumGapMm:minimum * 1000,maximumGapMm:maximum * 1000,maximumGripOverlapMm:maximumGripOverlap * 1000,knobDiameterMm:knob.geometry.parameters.radiusTop * 2000,knobHeightAboveLidMm:knob.position.y * 1000}));


// Audit whole mesh surfaces as well. A center-line knob ray cannot detect a finger
// entering the crown, or a tilted lid cutting through the vessel wall during descent.
const geometryTrees = new Map();
function geometryTree(geometry) {
  if (geometryTrees.has(geometry)) return geometryTrees.get(geometry);
  const positions = geometry.attributes.position, index = geometry.index, faces = [];
  const count = index ? index.count : positions.count;
  for (let vertex = 0; vertex < count; vertex += 3) {
    const points = [0, 1, 2].map(offset => new T.Vector3().fromBufferAttribute(
      positions, index ? index.getX(vertex + offset) : vertex + offset
    ));
    const bounds = new T.Box3().setFromPoints(points);
    faces.push({points, bounds, center: bounds.getCenter(new T.Vector3())});
  }
  function node(entries) {
    const bounds = new T.Box3();
    entries.forEach(face => bounds.union(face.bounds));
    if (entries.length <= 20) return {bounds, faces: entries};
    const size = bounds.getSize(new T.Vector3());
    let axis = 'x';
    if (size.y > size.x) axis = 'y';
    if (size.z > size[axis]) axis = 'z';
    entries.sort((a, b) => a.center[axis] - b.center[axis]);
    const half = entries.length >> 1;
    return {bounds, left: node(entries.slice(0, half)), right: node(entries.slice(half))};
  }
  const tree = node(faces);
  geometryTrees.set(geometry, tree);
  return tree;
}

function trianglesIntersect(first, second) {
  const firstEdges = [first[1].clone().sub(first[0]), first[2].clone().sub(first[1]), first[0].clone().sub(first[2])];
  const secondEdges = [second[1].clone().sub(second[0]), second[2].clone().sub(second[1]), second[0].clone().sub(second[2])];
  const firstNormal = firstEdges[0].clone().cross(firstEdges[1]);
  const secondNormal = secondEdges[0].clone().cross(secondEdges[1]);
  // Face normals and edge cross products handle spatial triangles. The additional
  // in-plane axes cover coplanar contact without treating whole mesh bounds as solids.
  const axes = [firstNormal, secondNormal,
    ...firstEdges.flatMap(edge => secondEdges.map(other => edge.clone().cross(other))),
    ...firstEdges.map(edge => firstNormal.clone().cross(edge)),
    ...secondEdges.map(edge => secondNormal.clone().cross(edge))];
  for (const axis of axes) {
    if (axis.lengthSq() < 1e-18) continue;
    axis.normalize();
    const firstProjection = first.map(point => axis.dot(point));
    const secondProjection = second.map(point => axis.dot(point));
    if (Math.max(...firstProjection) < Math.min(...secondProjection) - 1e-8 ||
        Math.max(...secondProjection) < Math.min(...firstProjection) - 1e-8) return false;
  }
  return true;
}

function meshesIntersect(first, second) {
  const firstTree = geometryTree(first.geometry), secondTree = geometryTree(second.geometry);
  const firstWorldBounds = firstTree.bounds.clone().applyMatrix4(first.matrixWorld);
  const secondWorldBounds = secondTree.bounds.clone().applyMatrix4(second.matrixWorld);
  if (!firstWorldBounds.intersectsBox(secondWorldBounds)) return false;
  const toSecond = second.matrixWorld.clone().invert().multiply(first.matrixWorld);
  function queryFace(face) {
    const points = face.points.map(point => point.clone().applyMatrix4(toSecond));
    const bounds = new T.Box3().setFromPoints(points);
    function visitSecond(node) {
      if (!node.bounds.intersectsBox(bounds)) return false;
      if (!node.faces) return visitSecond(node.left) || visitSecond(node.right);
      return node.faces.some(other => bounds.intersectsBox(other.bounds) && trianglesIntersect(points, other.points));
    }
    return visitSecond(secondTree);
  }
  function visitFirst(node) {
    if (!node.bounds.clone().applyMatrix4(toSecond).intersectsBox(secondTree.bounds)) return false;
    if (!node.faces) return visitFirst(node.left) || visitFirst(node.right);
    return node.faces.some(queryFace);
  }
  return visitFirst(firstTree);
}

const armMeshes = [];
rig.arms.right.root.traverse(object => {if (object.isMesh) armMeshes.push(object);});
const lidMeshes = lid.children.filter(object => object.isMesh);
const potMeshes = pot.children.filter(object => object.isMesh);
let surfacePoses = 0;
for (let frame = 0; frame <= (episode.frameCount - 1) * 2; frame++) {
  const time = frame / (episode.fps * 2);
  update(time);
  for (const cover of lidMeshes) {
    assert(!meshesIntersect(cover, scene.getObjectByName('Tabletop')), `${cover.name} intersects the table at ${time}s`);
    for (const arm of armMeshes) {
      const expectedGrasp = cover === knob && fingers.includes(arm) && time >= 20.1 && time <= 25.1;
      if (expectedGrasp) continue;
      assert(!meshesIntersect(cover, arm), `${cover.name} intersects the right arm at ${time}s`);
    }
    for (const vessel of potMeshes) {
      assert(!meshesIntersect(cover, vessel), `${cover.name} intersects ${vessel.name} at ${time}s`);
    }
  }
  for (const arm of armMeshes) for (const vessel of potMeshes) {
    assert(!meshesIntersect(arm, vessel), `Right arm intersects ${vessel.name} at ${time}s`);
  }
  surfacePoses++;
}
// Confirm the narrow phase detects the reported old-height regression at 24.9 s.
update(24.9);
const verticalScale = pot.scale.y;
pot.scale.y = 1;
scene.updateMatrixWorld(true);
assert(meshesIntersect(scene.getObjectByName('Lid crown'), scene.getObjectByName('Pot body')),
  'The surface audit missed the old-height pot/lid intersection');
pot.scale.y = verticalScale;
scene.updateMatrixWorld(true);
assert.equal(digest(), original, 'Recorded qpos changed during the surface audit');
console.log(JSON.stringify({surfacePoses, rightArmMeshes: armMeshes.length,
  lidMeshes: lidMeshes.length, potMeshes: potMeshes.length, supportGapMm: supportGap * 1000, initialSupportGapMm: initialSupportGap * 1000,
  unintendedSurfaceIntersections: 0, oldHeightRegressionDetected: true}));
console.log('PASS: recorded knob grip, continuous seating, full lid/pot/right-arm mesh surfaces, supported rest poses, and unchanged recorded qpos.');
