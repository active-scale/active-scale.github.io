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
let minimum = Infinity, maximum = -Infinity, samples = 0;
function update(time) {
  rig.pose(recordedJoints(episode, time, defaults));
  const before = rig.arms.right.links.link6.matrixWorld.elements.slice();
  placement.update(time, episode, rig);
  assert.deepEqual(rig.arms.right.links.link6.matrixWorld.elements, before, 'Object update changed the recorded wrist pose');
  scene.updateMatrixWorld(true);
}
// Ray distances compare each real inner finger surface with the knob's actual triangle surface.
for (let frame = 20.5 * 60; frame <= 25.1 * 60; frame++) {
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
  samples++;
}
for (const time of [20.5, 25.1, 25.42]) {
  update(time - .0001);
  const position = lid.position.clone(), rotation = lid.quaternion.clone();
  update(time + .0001);
  assert(position.distanceTo(lid.position) < .0005, 'Lid position jumps at ' + time);
  assert(rotation.angleTo(lid.quaternion) < .001, 'Lid orientation jumps at ' + time);
}
update(0);
const table = new T.Box3().setFromObject(scene.getObjectByName('Tabletop'));
const initialLid = new T.Box3().setFromObject(lid);
assert(Math.abs(initialLid.min.y - table.max.y) < 1e-6, 'Initial lid is not resting on the table');
update(27);
const pot = scene.getObjectByName('Pot');
assert(lid.position.clone().sub(pot.position).distanceTo(new T.Vector3(0, .134, 0)) < 1e-8, 'Released lid is not on the pot');
assert.equal(digest(), original, 'Recorded qpos changed');
console.log(JSON.stringify({samples,from:20.5,to:25.1,contacts:samples * 2,minimumGapMm:minimum * 1000,maximumGapMm:maximum * 1000,knobDiameterMm:knob.geometry.parameters.radiusTop * 2000,knobHeightAboveLidMm:knob.position.y * 1000}));
console.log('PASS: both real finger meshes contact the lid knob throughout the recorded hold, continuous pickup/release, tabletop and pot support, unchanged recorded qpos.');
