import * as T from './vendor/three.module.min.js';
import {defaults} from './assets/robot-models/amp.mjs?v=20261104slots1';
import {createVisitorAvatar} from './visitor-avatar.mjs?v=20261104visitor1';

const names=['joint1','joint2','joint3','joint4','joint5','joint6'];
const tool=new T.Vector3(0,0,.17);
const ease=(time,a,b)=>T.MathUtils.smoothstep(time,a,b);
const lerp=T.MathUtils.lerp;

function solvePoint(arm,target,seed) {
  const values=[...seed];
  const apply=()=>{names.forEach((name,index)=>arm.setJoint(name,values[index]));arm.root.updateWorldMatrix(true,true);};
  for(let pass=0;pass<180;pass++){
    apply();
    if(arm.links.link6.localToWorld(tool.clone()).distanceTo(target)<.00001)break;
    for(const index of [4,2,1,0]){
      const joint=arm.joints[names[index]];
      const origin=joint.frame.getWorldPosition(new T.Vector3());
      const axis=joint.axis.clone().applyQuaternion(joint.frame.getWorldQuaternion(new T.Quaternion()));
      const current=arm.links.link6.localToWorld(tool.clone()).sub(origin).projectOnPlane(axis).normalize();
      const desired=target.clone().sub(origin).projectOnPlane(axis).normalize();
      const delta=Math.atan2(axis.dot(current.clone().cross(desired)),current.dot(desired));
      values[index]=T.MathUtils.clamp(values[index]+T.MathUtils.clamp(delta,-.2,.2),...joint.range);
      apply();
    }
  }
  return values;
}

function comicBurst() {
  const root=new T.Group();
  const stars=[];
  for(let n=0;n<9;n++){
    const shape=new T.Shape();
    for(let point=0;point<10;point++){
      const angle=point*Math.PI/5-Math.PI/2,radius=point%2?.025:.055;
      const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius;
      if(!point)shape.moveTo(x,y);else shape.lineTo(x,y);
    }
    shape.closePath();
    const star=new T.Mesh(new T.ShapeGeometry(shape),new T.MeshBasicMaterial({color:n%2?'#f4bc57':'#9d76dc',side:T.DoubleSide,transparent:true}));
    root.add(star);stars.push(star);
  }
  const ring=new T.Mesh(new T.TorusGeometry(.10,.008,6,48),new T.MeshBasicMaterial({color:'#fff4bf',transparent:true,side:T.DoubleSide}));
  ring.rotation.y=Math.PI/2;root.add(ring);
  return {root,update(age){
    const progress=T.MathUtils.clamp(age/.65,0,1);root.visible=age>=0&&age<1.5;
    stars.forEach((star,n)=>{
      const theta=n*Math.PI*2/stars.length;
      const radius=.11+progress*.46;
      star.position.set(Math.sin(theta)*radius,.04+Math.cos(theta)*radius,Math.sin(theta*2)*.08);
      star.rotation.z=theta+age*3;star.material.opacity=1-T.MathUtils.smoothstep(age,.45,1.2);
    });
    ring.scale.setScalar(1+progress*3.5);ring.material.opacity=1-progress;
  }};
}

/** A user-triggered cartoon vignette; the normal demonstration owns the environment. */
export async function createTeleopEasterEgg({scene,rig}) {
  const duration=9.4,impact=3.75;
  const basePosition=rig.root.position.clone(),baseRotation=rig.root.quaternion.clone();
  const visitorPosition=new T.Vector3(2.30,.85,.08);
  const drive=.58,turn=Math.PI/2;
  const guest=await createVisitorAvatar(),burst=comicBurst();
  scene.add(guest.root,burst.root);guest.root.visible=false;burst.root.visible=false;
  guest.root.position.copy(visitorPosition);guest.pose();
  const glove=new T.Group();glove.name='Cartoon boxing glove';
  const red=new T.MeshStandardMaterial({color:'#df554b',roughness:.62});
  const cuff=new T.Mesh(new T.CylinderGeometry(.053,.053,.052,24),new T.MeshStandardMaterial({color:'#f5dfbd',roughness:.85}));
  cuff.rotation.x=Math.PI/2;cuff.position.z=.09;glove.add(cuff);
  const fist=new T.Mesh(new T.SphereGeometry(.075,28,20),red);fist.position.copy(tool);glove.add(fist);
  const thumb=new T.Mesh(new T.SphereGeometry(.028,18,12),red);thumb.position.set(0,-.047,.142);glove.add(thumb);
  rig.arms.right.links.link6.add(glove);glove.visible=false;
  const finalRotation=baseRotation.clone().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),turn));
  const finalPosition=basePosition.clone().add(new T.Vector3(drive,0,0));
  rig.root.position.copy(finalPosition);rig.root.quaternion.copy(finalRotation);
  rig.pose(structuredClone(defaults));
  // Find the actual clothed torso surface, rather than aiming at a primitive proxy.
  const bodyRay=new T.Raycaster(new T.Vector3(visitorPosition.x-1,1.10,visitorPosition.z),new T.Vector3(1,0,0));
  const bodyHit=bodyRay.intersectObject(guest.root,true)[0];
  if(!bodyHit)throw new Error('The rigged visitor torso is outside the cartoon contact line.');
  const surfacePoint=bodyHit.point.clone();
  const contact=surfacePoint.clone().add(new T.Vector3(-.075,0,0));
  const arm=rig.arms.right;
  const windup=solvePoint(arm,contact.clone().add(new T.Vector3(-.23,.015,0)),[0,.1,0,0,0,0]);
  const punch=solvePoint(arm,contact,windup);
  const achieved=arm.links.link6.localToWorld(tool.clone());
  const contactError=achieved.distanceTo(contact);
  rig.root.position.copy(basePosition);rig.root.quaternion.copy(baseRotation);rig.pose(structuredClone(defaults));
  let active=false;
  const degrees=T.MathUtils.radToDeg;
  const phaseTime=time=>Math.max(0,Math.min(duration,time));
  const motion=time=>{
    const t=phaseTime(time);
    return {
      yaw:turn*(ease(t,.4,1.5)-ease(t,6.05,7.25)),
      travel:drive*(ease(t,1.5,2.9)-ease(t,4.9,6.05)),
      punch:ease(t,3.45,impact)*(1-ease(t,4.05,4.6)),
    };
  };
  function stop(){
    active=false;guest.root.visible=false;burst.root.visible=false;glove.visible=false;
    rig.root.position.copy(basePosition);rig.root.quaternion.copy(baseRotation);rig.root.updateMatrixWorld(true);
  }
  function start(){active=true;guest.root.visible=true;glove.visible=true;guest.opacity(0);}
  function aimHead(target,calibration){
    const cameraArm=rig.arms.center;
    for(let iteration=0;iteration<20;iteration++)for(const name of ['joint5','joint1']){
      const joint=cameraArm.joints[name];
      const axis=joint.axis.clone().applyQuaternion(joint.frame.getWorldQuaternion(new T.Quaternion()));
      const origin=cameraArm.optical.getWorldPosition(new T.Vector3());
      const forward=cameraArm.optical.getWorldDirection(new T.Vector3()).projectOnPlane(axis).normalize();
      const desired=target.clone().sub(origin).projectOnPlane(axis).normalize();
      const delta=Math.atan2(axis.dot(forward.clone().cross(desired)),forward.dot(desired));
      const angle=T.MathUtils.clamp(T.MathUtils.degToRad(calibration.joints.center[name]??0)+delta,...joint.range);
      calibration.joints.center[name]=degrees(angle);cameraArm.setJoint(name,angle);rig.root.updateMatrixWorld(true);
    }
  }
  function update(elapsedSeconds){
    const t=phaseTime(elapsedSeconds),m=motion(t);
    rig.root.position.copy(basePosition).add(new T.Vector3(m.travel,0,0));
    rig.root.quaternion.copy(baseRotation).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),m.yaw));
    const calibration=structuredClone(defaults);
    names.forEach((name,index)=>calibration.joints.right[name]=degrees(lerp(windup[index],punch[index],m.punch)));
    calibration.joints.right.joint7=0;calibration.joints.right.joint8=0;
    calibration.joints.left={joint2:35,joint3:-60,joint5:30,joint7:0,joint8:0};
    calibration.joints.center={joint2:31,joint3:-39,joint5:25};
    rig.pose(calibration);
    guest.root.position.copy(visitorPosition);guest.root.rotation.set(0,0,0);
    const age=Math.max(0,t-impact),fly=T.MathUtils.clamp(age/1.55,0,1);
    if(t>=impact){
      guest.root.position.x+=1.36*fly;
      guest.root.position.y+=1.25*Math.sin(fly*Math.PI*.78);
      guest.root.rotation.z=-fly*Math.PI*1.6;
      guest.root.rotation.y=fly*.8;
    }
    guest.pose(t,ease(t,impact,impact+.22));
    guest.opacity(ease(t,0,.35)*(1-ease(t,5.0,5.6)));
    guest.root.visible=t<5.6;
    guest.shadow.visible=t<impact;
    burst.root.position.copy(contact).add(new T.Vector3(.075,0,0));burst.update(t-impact);
    aimHead(guest.root.position.clone().add(new T.Vector3(0,.18,0)),calibration);
    rig.pose(calibration);
    const fistPoint=arm.links.link6.localToWorld(tool.clone());
    const headDirection=rig.arms.center.optical.getWorldDirection(new T.Vector3());
    const h=.0001,a=motion(t-h),b=motion(t+h);
    const forwardVelocity=(b.travel-a.travel)/(2*h);
    const yawVelocity=(b.yaw-a.yaw)/(2*h);
    const stage=t<1.5?'A little detour…':t<2.9?'Rolling over':t<3.45?'Ready?':t<4.25?'Boop!':t<6.05?'Heading back':'Back to science';
    return {
      calibration,handMotion:new T.Vector3(m.punch*.18,m.punch*.08,0),headDirection,reach:m.punch,
      operatorPunch:m.punch,
      mobile:{travel:m.travel,yaw:m.yaw,forwardVelocity,yawVelocity,button:t>=1.5&&t<2.9?'B':t>=4.9&&t<6.05?'A':(t>=.4&&t<1.5?'X':t>=6.05&&t<7.25?'Y':null)},
      stage,done:t>=duration,
      framingBlend:ease(t,0,.5)*(1-ease(t,7.5,duration)),
      fistPoint,contactError,impact,
    };
  }
  return {start,stop,update,get active(){return active;},duration,impact,contactError,
    framing:{target:new T.Vector3(1.05,1.02,.04),distance:6.2},
    guest:guest.root,glove,contact,surfacePoint};
}
