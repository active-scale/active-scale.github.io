import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from '../vendor/three.module.min.js';
import {createAmp} from '../assets/robot-models/amp.mjs';
import {createTeleopEasterEgg} from '../teleop-easter-egg.mjs';

globalThis.ProgressEvent??=Event;
globalThis.fetch=async resource=>{
  const url=new URL(resource.url??resource);
  assert.equal(url.protocol,'file:');
  return new Response(await readFile(url));
};
const rig=await createAmp();
rig.root.position.set(.87,0,-.22);rig.root.rotation.y=-Math.PI/2;
const scene=new T.Scene();scene.add(rig.root);
const restPosition=rig.root.position.clone(),restRotation=rig.root.quaternion.clone();
const egg=createTeleopEasterEgg({scene,rig});
assert.ok(!egg.active&&!egg.guest.visible&&!egg.glove.visible);
egg.start();
assert.ok(egg.active);
for(let frame=0;frame<=564;frame++){
  const time=frame/60,state=egg.update(time);
  assert.ok([...rig.root.matrixWorld.elements,...egg.guest.matrix.elements,...state.headDirection.toArray()].every(Number.isFinite));
  assert.ok(egg.guest.position.x<3.67,'Visitor leaves the cartoon framing.');
  if(time<egg.impact)assert.ok(egg.guest.position.distanceTo(new T.Vector3(2.3,.85,.08))<1e-12,'Visitor launches before contact.');
  for(const [name,arm] of Object.entries(rig.arms))for(const [key,joint] of Object.entries(arm.joints)){
    const value=(state.calibration.joints[name][key]??0)*(joint.type==='slide'?.001:Math.PI/180);
    assert.ok(value>=joint.range[0]-1e-9&&value<=joint.range[1]+1e-9,'A cartoon pose exceeds a vendor joint range.');
  }
}
const contact=egg.update(egg.impact);
assert.ok(contact.fistPoint.distanceTo(egg.contact)<.00002,'Fist misses the visitor at impact.');
assert.ok(Math.abs(egg.guest.position.x-2.3)<1e-12);
egg.update(egg.impact+.1);assert.ok(egg.guest.position.x>2.3&&egg.guest.position.y>.85);
assert.ok(egg.update(egg.duration).done);
egg.stop();
assert.ok(!egg.active&&!egg.guest.visible&&!egg.glove.visible);
assert.ok(rig.root.position.distanceTo(restPosition)<1e-12);
assert.ok(rig.root.quaternion.angleTo(restRotation)<1e-12);
console.log('Cartoon teleoperation: 565 poses, contact within 0.02 mm, post-impact launch, and cleanup passed.');
