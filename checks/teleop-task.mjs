import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from '../vendor/three.module.min.js';
import {createAmp} from '../assets/robot-models/amp.mjs';
import {createTeleopTask} from '../teleop-task.mjs';
import {readTeleopPoses} from '../teleop-hud.mjs';

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
let minimumHeadAimDot=1,maximumHeadClip=0;
let minimumBaseTravel=0,maximumBaseYaw=0;
scene.updateMatrixWorld(true);
const fixedTableTransform=task.table.matrixWorld.clone();
const initialBasePosition=rig.root.position.clone(),initialBaseRotation=rig.root.quaternion.clone();
const headProjection=new T.PerspectiveCamera(52.4,4/3,.01,3);
const accidentalBlockIntersections=[];

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
  minimumBaseTravel=Math.min(minimumBaseTravel,state.mobile.travel);
  maximumBaseYaw=Math.max(maximumBaseYaw,state.mobile.yaw);
  scene.updateMatrixWorld(true);
  assert.ok(task.table.matrixWorld.elements.every((x,i)=>Math.abs(x-fixedTableTransform.elements[i])<1e-9),'The environment table moves with the base.');
  const optical=rig.arms.center.optical;
  const eye=optical.getWorldPosition(new T.Vector3()),gaze=optical.getWorldDirection(new T.Vector3());
  minimumHeadAimDot=Math.min(minimumHeadAimDot,gaze.dot(task.block.position.clone().sub(eye).normalize()));
  headProjection.position.copy(eye);headProjection.quaternion.copy(optical.getWorldQuaternion(new T.Quaternion()));headProjection.updateMatrixWorld(true);
  const clip=task.block.position.clone().project(headProjection);maximumHeadClip=Math.max(maximumHeadClip,Math.abs(clip.x),Math.abs(clip.y));
  const readouts=readTeleopPoses(rig),reference=rig.arms.center.root;
  const readoutHead=new T.Vector3(...readouts.head.position);readoutHead.z-=.25;reference.localToWorld(readoutHead);
  assert.ok(readoutHead.distanceTo(eye)<1e-9,'HUD head position disagrees with physical optical FK.');
  const physicalTravel=rig.root.position.clone().sub(initialBasePosition).applyQuaternion(initialBaseRotation.clone().invert()).x;
  assert.ok(Math.abs(state.mobile.travel-physicalTravel)<1e-9,'HUD base displacement disagrees with actual rig transform.');
  const inverseBlock=task.block.matrixWorld.clone().invert();
  task.block.geometry.computeBoundingBox();
  for(const mesh of robotMeshes){
    let part=mesh.parent;while(part&&!part.name)part=part.parent;
    if(part?.name==='link7'||part?.name==='link8')continue; // Intended finger/block contact is tested separately below.
    if(intersectsTable(mesh,task.block.geometry.boundingBox,inverseBlock))accidentalBlockIntersections.push({frame,part:part?.name});
  }
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

assert.ok(minimumHeadAimDot>.9999,'The head camera does not face the operated block.');
assert.ok(maximumHeadClip<.01,'The operated block is not centered in the mounted head camera.');
assert.equal(accidentalBlockIntersections.length,0,'A robot part other than the fingers intersects the block: '+JSON.stringify(accidentalBlockIntersections.slice(0,5)));
assert.equal(collisions.length, 0, 'Robot/table intersections: ' + JSON.stringify(collisions.slice(0, 10)));
assert.ok(minimumTableClearance >= -1e-5, 'The block penetrates the tabletop.');
assert.ok(minimumJawClearance >= -2e-5, 'The closed fingers penetrate the block.');
assert.ok(maximumJawGap <= .0002, 'The closed fingers leave more than 0.2 mm clearance.');
assert.ok(maximumAttachmentDrift < 1e-7, 'The held block drifts relative to the gripper.');
assert.ok(minimumBaseTravel<=-.10&&maximumBaseYaw>=T.MathUtils.degToRad(10),'The opening base movement is too small to see clearly.');
assert.ok(task.duration<=18,'The illustrative teleoperation loop is too slow.');

// Verify the displayed controls match the actual differential-drive trajectory.
for(const [progress,key,axis,sign] of [[.02,'A','travel',-1],[.06,'X','yaw',1],[.10,'Y','yaw',-1],[.145,'B','travel',1]]){
  const h=1e-4;
  const a=task.update(progress-h).mobile,b=task.update(progress+h).mobile;
  const current=task.update(progress).mobile;
  const velocity=(b[axis]-a[axis])/(2*h*task.duration);
  const displayed=axis==='travel'?current.forwardVelocity:current.yawVelocity;
  assert.equal(current.button,key);assert.ok(velocity*sign>0,'Button mapping has the wrong physical direction');
  assert.ok(Math.abs(velocity-displayed)<1e-5,'Base HUD velocity does not match realized transform derivative');
}
// The gripper can partially occlude the cube, but the head camera must still see it.
const ray=new T.Raycaster(),viewObstacles=[...robotMeshes,...tableMeshes];let minimumVisibleCubeCorners=8;
for(let sample=0;sample<=40;sample++){
  task.update(sample/40);scene.updateMatrixWorld(true);
  const eye=rig.arms.center.optical.getWorldPosition(new T.Vector3());let visible=0;
  for(const x of [-.0225,.0225])for(const y of [-.031,.031])for(const z of [-.0225,.0225]){
    const point=task.block.localToWorld(new T.Vector3(x,y,z)),direction=point.sub(eye);
    ray.set(eye,direction.clone().normalize());ray.near=.006;ray.far=direction.length()-.001;
    if(!ray.intersectObjects(viewObstacles,false).length)visible++;
  }
  minimumVisibleCubeCorners=Math.min(minimumVisibleCubeCorners,visible);
}
assert.ok(minimumVisibleCubeCorners>0,'The robot head looks toward the cube but geometry completely blocks its view');

task.update(0);
const firstBasePosition=rig.root.position.clone(),firstBaseRotation=rig.root.quaternion.clone();
const firstPosition = task.block.position.clone();
const firstRotation = task.block.quaternion.clone();
const firstTools=Object.fromEntries(Object.entries(rig.arms).map(([name,arm])=>[name,arm.links.link6.matrixWorld.clone()]));
task.update(1);
assert.ok(rig.root.position.distanceTo(firstBasePosition)<1e-9&&rig.root.quaternion.angleTo(firstBaseRotation)<1e-7,'Mobile base jumps at loop boundary');
assert.ok(task.block.position.distanceTo(firstPosition) < 1e-8, 'The block jumps at the loop boundary.');
assert.ok(task.block.quaternion.angleTo(firstRotation) < 1e-7, 'The block rotates at the loop boundary.');
for(const [name,arm]of Object.entries(rig.arms)){
  assert.ok(arm.links.link6.matrixWorld.elements.every((value,index)=>Math.abs(value-firstTools[name].elements[index])<1e-7),name+' arm jumps at loop boundary.');
}

console.log(JSON.stringify({
  samples: 401,
  minimumHeadAimDot,maximumHeadClip,minimumVisibleCubeCorners,
  accidentalRobotBlockCollisions:accidentalBlockIntersections.length,
  environmentTable:'fixed in world coordinates',
  baseMotion:{reverseForwardMm:-minimumBaseTravel*1000,leftRightDegrees:T.MathUtils.radToDeg(maximumBaseYaw),durationSeconds:task.duration,questMapping:'Appendix B.1'},
  robotTableTriangleCollisions: collisions.length,
  minimumBlockTableClearanceMm: Number((minimumTableClearance * 1000).toFixed(4)),
  minimumJawClearanceMm: Number((minimumJawClearance * 1000).toFixed(4)),
  maximumJawGapMm: Number((maximumJawGap * 1000).toFixed(4)),
  maximumAttachmentMatrixDrift: maximumAttachmentDrift,
  loopBoundary: 'continuous',
}, null, 2));
