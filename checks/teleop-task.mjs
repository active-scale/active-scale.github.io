import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from '../vendor/three.module.min.js';
import {createAmp} from '../assets/robot-models/amp.mjs';
import {createTeleopTask} from '../teleop-task.mjs';

// The production loaders fetch relative assets. This standalone Node check reads
// exactly those local files, with no server or browser required.
globalThis.ProgressEvent ??= Event;
globalThis.fetch = async resource => {
  const url = new URL(resource.url ?? resource);
  assert.equal(url.protocol, 'file:', 'The audit must use local assets.');
  return new Response(await readFile(url));
};

const rig = await createAmp();
rig.root.position.set(.87, 0, -.22);
rig.root.rotation.y = -Math.PI / 2;
const scene = new T.Scene();
scene.add(rig.root);
const robotMeshes = [];
rig.root.traverse(object => {
  if (object.isMesh) robotMeshes.push(object);
});
const task = createTeleopTask(scene, rig);
const tableMeshes = task.table.children.filter(object => object.isMesh);
const tabletop = tableMeshes[0];
const triangle = new T.Triangle();
const collisions = [];
let minimumTableClearance = Infinity;
let minimumJawClearance = Infinity;
let maximumJawGap = -Infinity;
let maximumAttachmentDrift = 0;
let attachmentReference;

for (const key of task.keys) {
  assert.ok(key.positionError < .0002, 'IK keypoint exceeds 0.2 mm position error.');
  assert.ok(key.angleError < .002, 'IK keypoint exceeds 0.002 rad orientation error.');
}

function boundsInFrame(mesh, inverseFrame) {
  mesh.geometry.computeBoundingBox();
  return mesh.geometry.boundingBox.clone().applyMatrix4(
    inverseFrame.clone().multiply(mesh.matrixWorld)
  );
}

function intersectsTable(mesh, tableBox, inverseFrame) {
  const transform = inverseFrame.clone().multiply(mesh.matrixWorld);
  if (!boundsInFrame(mesh, inverseFrame).intersectsBox(tableBox)) return false;
  const geometry = mesh.geometry;
  const positions = geometry.getAttribute('position');
  const index = geometry.index;
  const count = index ? index.count : positions.count;
  for (let vertex = 0; vertex < count; vertex += 3) {
    triangle.a.fromBufferAttribute(positions, index ? index.getX(vertex) : vertex).applyMatrix4(transform);
    triangle.b.fromBufferAttribute(positions, index ? index.getX(vertex + 1) : vertex + 1).applyMatrix4(transform);
    triangle.c.fromBufferAttribute(positions, index ? index.getX(vertex + 2) : vertex + 2).applyMatrix4(transform);
    if (tableBox.intersectsTriangle(triangle)) return true;
  }
  return false;
}

for (let frame = 0; frame <= 400; frame++) {
  const progress = frame / 400;
  const state = task.update(progress);
  scene.updateMatrixWorld(true);
  const inverseRig = rig.root.matrixWorld.clone().invert();
  const tableBoxes = tableMeshes.map(mesh => boundsInFrame(mesh, inverseRig));
  const topBounds = boundsInFrame(tabletop, inverseRig);
  const blockBounds = boundsInFrame(task.block, inverseRig);

  minimumTableClearance = Math.min(minimumTableClearance, blockBounds.min.y - topBounds.max.y);
  assert.ok(blockBounds.min.x >= topBounds.min.x && blockBounds.max.x <= topBounds.max.x,
    'The block leaves the table footprint in X.');
  assert.ok(blockBounds.min.z >= topBounds.min.z && blockBounds.max.z <= topBounds.max.z,
    'The block leaves the table footprint in Z.');

  for (const [partIndex, tableBox] of tableBoxes.entries()) {
    for (const mesh of robotMeshes) {
      if (intersectsTable(mesh, tableBox, inverseRig)) {
        collisions.push({frame, tablePart: partIndex === 0 ? 'top' : 'leg ' + partIndex,
          robotPart: mesh.name || mesh.parent.name});
      }
    }
  }

  for (const [name, angles] of Object.entries(state.calibration.joints)) {
    for (const [jointName, value] of Object.entries(angles)) {
      const joint = rig.arms[name].joints[jointName];
      const physicalValue = joint.type === 'slide' ? value / 1000 : T.MathUtils.degToRad(value);
      assert.ok(physicalValue >= joint.range[0] - 1e-9 && physicalValue <= joint.range[1] + 1e-9,
        name + ' ' + jointName + ' exceeds the vendor limit at sample ' + frame);
    }
  }

  if (state.phase >= .34 && state.phase <= .74) {
    const tool = rig.arms.right.links.link6;
    const inverseTool = tool.matrixWorld.clone().invert();
    const blockInTool = boundsInFrame(task.block, inverseTool);
    const negativeFinger = rig.arms.right.links.link7.children.find(object => object.isMesh);
    const positiveFinger = rig.arms.right.links.link8.children.find(object => object.isMesh);
    const negativeBounds = boundsInFrame(negativeFinger, inverseTool);
    const positiveBounds = boundsInFrame(positiveFinger, inverseTool);
    const clearances = [
      blockInTool.min.y - negativeBounds.max.y,
      positiveBounds.min.y - blockInTool.max.y,
    ];
    minimumJawClearance = Math.min(minimumJawClearance, ...clearances);
    maximumJawGap = Math.max(maximumJawGap, ...clearances);
    assert.ok(blockInTool.max.z > negativeBounds.min.z && blockInTool.min.z < negativeBounds.max.z,
      'The closed fingers do not overlap the block along the tool axis.');

    const attachment = inverseTool.multiply(task.block.matrixWorld);
    if (!attachmentReference) attachmentReference = attachment.clone();
    maximumAttachmentDrift = Math.max(maximumAttachmentDrift,
      ...attachment.elements.map((value, index) => Math.abs(value - attachmentReference.elements[index])));
  }
}

assert.equal(collisions.length, 0, 'Robot/table intersections: ' + JSON.stringify(collisions.slice(0, 10)));
assert.ok(minimumTableClearance >= -1e-5, 'The block penetrates the tabletop.');
assert.ok(minimumJawClearance >= -2e-5, 'The closed fingers penetrate the block.');
assert.ok(maximumJawGap <= .0002, 'The closed fingers leave more than 0.2 mm clearance.');
assert.ok(maximumAttachmentDrift < 1e-7, 'The held block drifts relative to the gripper.');

task.update(0);
const firstPosition = task.block.position.clone();
const firstRotation = task.block.quaternion.clone();
task.update(1);
assert.ok(task.block.position.distanceTo(firstPosition) < 1e-8, 'The block jumps at the loop boundary.');
assert.ok(task.block.quaternion.angleTo(firstRotation) < 1e-7, 'The block rotates at the loop boundary.');

console.log(JSON.stringify({
  samples: 401,
  robotTableTriangleCollisions: collisions.length,
  minimumBlockTableClearanceMm: Number((minimumTableClearance * 1000).toFixed(4)),
  minimumJawClearanceMm: Number((minimumJawClearance * 1000).toFixed(4)),
  maximumJawGapMm: Number((maximumJawGap * 1000).toFixed(4)),
  maximumAttachmentMatrixDrift: maximumAttachmentDrift,
  loopBoundary: 'continuous',
}, null, 2));
