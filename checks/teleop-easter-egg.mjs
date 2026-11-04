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
const egg=await createTeleopEasterEgg({scene,rig});
assert.ok(!egg.active&&!egg.guest.visible&&!egg.glove.visible);
egg.start();
assert.ok(egg.active);
const samples=Math.ceil(egg.duration*60);
for(let frame=0;frame<=samples;frame++){
  const time=Math.min(frame/60,egg.duration),state=egg.update(time);
  assert.ok([...rig.root.matrixWorld.elements,...egg.guest.matrix.elements,...state.headDirection.toArray()].every(Number.isFinite));
  assert.ok(egg.guest.position.x<3.67,'Visitor leaves the cartoon framing.');
  if(time<egg.impact)assert.ok(egg.guest.position.distanceTo(new T.Vector3(2.3,.85,.08))<1e-12,'Visitor launches before contact.');
  for(const [name,arm] of Object.entries(rig.arms))for(const [key,joint] of Object.entries(arm.joints)){
    const value=(state.calibration.joints[name][key]??0)*(joint.type==='slide'?.001:Math.PI/180);
    assert.ok(value>=joint.range[0]-1e-9&&value<=joint.range[1]+1e-9,'A cartoon pose exceeds a vendor joint range.');
  }
}
assert.ok(egg.duration<=7&&egg.impact<=2.6,'The secret move takes too long to reach the joke.');
// Inspect the physical glove path at 1 kHz around the 90 ms jab. A 60 Hz
// whole-vignette audit alone can miss its peak and accidentally permit a slow jab.
const windup=egg.update(egg.impact-.10).fistPoint.clone();
let maximumJabSpeed=0,previous=windup.clone(),previousTime=egg.impact-.10;
for(let step=1;step<=100;step++){
  const time=egg.impact-.10+step*.001,state=egg.update(time);
  maximumJabSpeed=Math.max(maximumJabSpeed,state.fistPoint.distanceTo(previous)/(time-previousTime));
  if(time<egg.impact)assert.ok(egg.guest.position.distanceTo(new T.Vector3(2.3,.85,.08))<1e-12,'Visitor launches before glove contact during the fast jab.');
  previous.copy(state.fistPoint);previousTime=time;
}
assert.equal(egg.update(egg.impact-.10).operatorPunch,0,'The jab starts without its anticipation beat.');
assert.ok(egg.update(egg.impact-.04).operatorPunch>.5,'The jab is not sharp enough.');
assert.ok(maximumJabSpeed>1.5,'The physical glove moves too slowly for the cartoon jab.');
const contact=egg.update(egg.impact);
assert.equal(contact.operatorPunch,1,'The fast jab misses its full-extension peak.');
assert.ok(contact.fistPoint.distanceTo(windup)>.10,'The glove jab has no visible stroke.');
assert.ok(contact.fistPoint.distanceTo(egg.contact)<.00002,'Fist misses the visitor at impact.');
const bodyRay=new T.Raycaster(contact.fistPoint.clone().add(new T.Vector3(-.5,0,0)),new T.Vector3(1,0,0));
const actualBodyHit=bodyRay.intersectObject(egg.guest,true)[0];
assert.ok(actualBodyHit,'The punch line misses the rigged torso.');
assert.ok(Math.abs(actualBodyHit.point.distanceTo(contact.fistPoint)-.075)<.00003,'Fist does not touch the actual visitor mesh.');
assert.ok(Math.abs(egg.guest.position.x-2.3)<1e-12);
const recoil=egg.update(egg.impact+.22);
assert.equal(recoil.operatorPunch,0,'The recoil takes longer than 220 ms after contact.');
assert.ok(recoil.fistPoint.distanceTo(windup)<1e-7,'The physical glove does not retract to its windup pose.');
egg.update(egg.impact+.1);assert.ok(egg.guest.position.x>2.3&&egg.guest.position.y>.85);
assert.ok(egg.update(egg.duration).done);
egg.stop();
assert.ok(!egg.active&&!egg.guest.visible&&!egg.glove.visible);
assert.ok(rig.root.position.distanceTo(restPosition)<1e-12);
assert.ok(rig.root.quaternion.angleTo(restRotation)<1e-12);
console.log(`Cartoon teleoperation: ${samples+1} poses, ${egg.duration} s vignette, peak jab ${maximumJabSpeed.toFixed(2)} m/s, contact within 0.02 mm, fast recoil, post-impact launch, and cleanup passed.`);
