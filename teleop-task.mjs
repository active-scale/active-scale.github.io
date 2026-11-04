import * as T from './vendor/three.module.min.js';
import {defaults} from './assets/robot-models/amp.mjs?v=20261104mast1';

const names = ['joint1','joint2','joint3','joint4','joint5','joint6'];
const gripPoint = new T.Vector3(0,0,.115);
const degrees = T.MathUtils.radToDeg;

function solveLinear(matrix, values) {
  const rows=matrix.map((row,index)=>[...row,values[index]]);
  for(let column=0;column<values.length;column++){
    let pivot=column;
    for(let row=column+1;row<values.length;row++)if(Math.abs(rows[row][column])>Math.abs(rows[pivot][column]))pivot=row;
    [rows[pivot],rows[column]]=[rows[column],rows[pivot]];
    const divisor=rows[column][column];
    if(Math.abs(divisor)<1e-12)return values.map(()=>0);
    for(let entry=column;entry<=values.length;entry++)rows[column][entry]/=divisor;
    for(let row=0;row<values.length;row++){
      if(row===column)continue;
      const factor=rows[row][column];
      for(let entry=column;entry<=values.length;entry++)rows[row][entry]-=factor*rows[column][entry];
    }
  }
  return rows.map(row=>row.at(-1));
}

function solvePose(arm,target,orientation,initial) {
  const angles=[...initial],weight=.16;
  const set=()=>names.forEach((name,index)=>arm.setJoint(name,angles[index]));
  const end=arm.links.link6;
  for(let iteration=0;iteration<240;iteration++){
    set();end.updateWorldMatrix(true,false);
    const position=end.localToWorld(gripPoint.clone());
    const rotation=end.getWorldQuaternion(new T.Quaternion());
    const errorRotation=orientation.clone().multiply(rotation.invert()).normalize();
    if(errorRotation.w<0)errorRotation.set(-errorRotation.x,-errorRotation.y,-errorRotation.z,-errorRotation.w);
    const angle=2*Math.acos(T.MathUtils.clamp(errorRotation.w,-1,1));
    const scale=angle<1e-7?2:angle/Math.sin(angle/2);
    const translation=target.clone().sub(position);
    const error=[...translation.toArray(),errorRotation.x*scale*weight,errorRotation.y*scale*weight,errorRotation.z*scale*weight];
    if(translation.length()<.00015&&angle<.002)return {angles,positionError:translation.length(),angleError:angle};
    const columns=names.map(name=>{
      const joint=arm.joints[name];
      const axis=joint.axis.clone().applyQuaternion(joint.frame.getWorldQuaternion(new T.Quaternion()));
      const origin=joint.frame.getWorldPosition(new T.Vector3());
      const velocity=axis.clone().cross(position.clone().sub(origin));
      return [...velocity.toArray(),...axis.multiplyScalar(weight).toArray()];
    });
    const normal=Array.from({length:6},(_,row)=>Array.from({length:6},(_,column)=>
      columns.reduce((sum,entry)=>sum+entry[row]*entry[column],0)+(row===column?.00012:0)));
    const solved=solveLinear(normal,error);
    names.forEach((name,index)=>{
      const delta=columns[index].reduce((sum,value,row)=>sum+value*solved[row],0);
      angles[index]=T.MathUtils.clamp(angles[index]+T.MathUtils.clamp(delta*.8,-.16,.16),...arm.joints[name].range);
    });
  }
  set();const position=end.localToWorld(gripPoint.clone());
  return {angles,positionError:position.distanceTo(target),angleError:end.getWorldQuaternion(new T.Quaternion()).angleTo(orientation)};
}

export function createTeleopTask(scene,rig) {
  rig.root.updateWorldMatrix(true,true);
  const root=new T.Group();scene.add(root);
  const surface=.79;
  const tabletop=new T.Mesh(new T.BoxGeometry(.60, .04, .94),new T.MeshStandardMaterial({color:'#d6c5ab',roughness:.72}));
  tabletop.position.set(.68, surface-.02, 0);
  const table=new T.Group();table.add(tabletop);
  for(const x of [.42,.94])for(const y of [-.42,.42]){
    const leg=new T.Mesh(new T.BoxGeometry(.035,.75,.035),new T.MeshStandardMaterial({color:'#465157',roughness:.62}));
    leg.position.set(x,.375,y);table.add(leg);
  }
  // Work in chassis coordinates, with +X forward and +Z vertical.
  // Place the table from the initial outer Y-up frame, then keep it fixed in the world.
  table.applyMatrix4(rig.root.matrixWorld);scene.add(table);
  const block=new T.Mesh(new T.BoxGeometry(.045,.062,.045),new T.MeshStandardMaterial({color:'#257f9b',roughness:.56}));
  root.add(block);
  const markerMaterial=new T.MeshStandardMaterial({color:'#e5d5b7',roughness:.88});
  const markers=[[-.23,.53],[-.07,.55]].map(([y,x])=>{
    const disk=new T.Mesh(new T.CylinderGeometry(.065,.065,.002,40),markerMaterial);
    // rig.root uses Y-up before the chassis's inner Z-up conversion.
    disk.position.set(x,surface+.001,-y);disk.applyMatrix4(rig.root.matrixWorld);scene.add(disk);return disk;
  });

  const arm=rig.arms.right;
  const base=rig.root;
  const initialBasePosition=base.position.clone(),initialBaseRotation=base.quaternion.clone();
  base.updateMatrixWorld(true);
  const toWorld=(x,y,z)=>base.localToWorld(new T.Vector3(x,z,-y));
  const targetRotation=base.getWorldQuaternion(new T.Quaternion()).multiply(
    new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(
      new T.Vector3(0,0,1),new T.Vector3(-1,0,0),new T.Vector3(0,-1,0)
    ))
  );
  const cubeRotation=base.getWorldQuaternion(new T.Quaternion());
  const pick=toWorld(.53,-.23,surface+.03105);
  const place=toWorld(.55,-.07,surface+.03105);
  const waypoints=[
    [0,.53,-.23,.88],
    [.15,.53,-.23,.86],
    [.27,.53,-.23,surface+.03105],
    [.34,.53,-.23,surface+.03105],
    [.46,.53,-.23,.89],
    [.62,.55,-.07,.86],
    [.74,.55,-.07,surface+.03105],
    [.82,.55,-.07,surface+.03105],
    [.93,.55,-.07,.86],
    [1,.53,-.23,.88],
  ];
  let seed=[.15,.85,-1.25,0,-.6,0];
  const keys=waypoints.map(([time,x,y,z])=>{
    let result=solvePose(arm,toWorld(x,y,z),targetRotation,seed);
    if(result.positionError>.002||result.angleError>.02){
      for(const shoulder of [1.5,2.2])for(const wrist of [-1,1])for(const roll of [-1,0,1]){
        const candidate=solvePose(arm,toWorld(x,y,z),targetRotation,[0,shoulder,-1.6,roll,wrist,0]);
        if(candidate.positionError+candidate.angleError*.16<result.positionError+result.angleError*.16)result=candidate;
      }
    }
    seed=result.angles;
    if(result.positionError>.004||result.angleError>.04)console.warn('Teleoperation task pose tolerance',time,result);
    return {time,...result};
  });
  const pickWorld=new T.Matrix4().compose(pick,cubeRotation,new T.Vector3(1,1,1));
  const pickIndex=2;
  names.forEach((name,index)=>arm.setJoint(name,keys[pickIndex].angles[index]));
  arm.links.link6.updateWorldMatrix(true,false);
  const attachment=arm.links.link6.matrixWorld.clone().invert().multiply(pickWorld);

  function sample(phase) {
    const index=Math.min(keys.length-2,Math.max(0,keys.findIndex((key,i)=>i<keys.length-1&&phase<=keys[i+1].time)));
    const first=keys[index],second=keys[index+1];
    const blend=T.MathUtils.smoothstep(phase,first.time,second.time);
    const angles=first.angles.map((value,j)=>T.MathUtils.lerp(value,second.angles[j],blend));
    const close=T.MathUtils.smoothstep(phase,.27,.34)*(1-T.MathUtils.smoothstep(phase,.74,.82));
    const jaw=T.MathUtils.lerp(35,22.52,close);
    return {angles,jaw};
  }
  function baseMotion(progress) {
    const ease=(start,end)=>T.MathUtils.smoothstep(progress,start,end);
    const travel=-.030*(ease(0,.04)-ease(.12,.17));
    const yaw=T.MathUtils.degToRad(3)*(ease(.04,.08)-ease(.08,.12));
    return {travel,yaw,button:progress<.04?'A':progress<.08?'X':progress<.12?'Y':progress<.17?'B':null};
  }
  function moveBase(progress) {
    const {travel,yaw,button}=baseMotion(progress);
    base.position.copy(initialBasePosition).add(new T.Vector3(travel,0,0).applyQuaternion(initialBaseRotation));
    base.quaternion.copy(initialBaseRotation).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),yaw));
    base.updateMatrixWorld(true);
    // Velocities are finite differences of the same physical transform trajectory.
    const h=1e-5,a=baseMotion(Math.max(0,progress-h)),b=baseMotion(Math.min(1,progress+h));
    const seconds=(Math.min(1,progress+h)-Math.max(0,progress-h))*24;
    const realizedDisplacement=base.position.clone().sub(initialBasePosition).applyQuaternion(initialBaseRotation.clone().invert());
    const realizedYaw=new T.Euler().setFromQuaternion(initialBaseRotation.clone().invert().multiply(base.quaternion),'YXZ').y;
    return {travel:realizedDisplacement.x,yaw:realizedYaw,button,forwardVelocity:(b.travel-a.travel)/seconds,yawVelocity:(b.yaw-a.yaw)/seconds};
  }
  function aimHead(target,calibration) {
    const center=calibration.joints.center,cameraArm=rig.arms.center;
    // Solve physical joints while keeping the optical frame rigidly attached to link6.
    for(let iteration=0;iteration<24;iteration++)for(const name of ['joint5','joint1']){
      const joint=cameraArm.joints[name];
      const axis=joint.axis.clone().applyQuaternion(joint.frame.getWorldQuaternion(new T.Quaternion()));
      const position=cameraArm.optical.getWorldPosition(new T.Vector3());
      const forward=cameraArm.optical.getWorldDirection(new T.Vector3()).projectOnPlane(axis).normalize();
      const desired=target.clone().sub(position).projectOnPlane(axis).normalize();
      const delta=Math.atan2(axis.dot(forward.clone().cross(desired)),forward.dot(desired));
      const angle=T.MathUtils.clamp(T.MathUtils.degToRad(center[name]??0)+delta,...joint.range);
      center[name]=degrees(angle);cameraArm.setJoint(name,angle);base.updateMatrixWorld(true);
    }
  }
  let referenceHandLocal;
  function update(progress) {
    progress=T.MathUtils.clamp(progress,0,1);
    const mobile=moveBase(progress);
    const manipulation=T.MathUtils.clamp((progress-.20)/.80,0,1);
    // Pick/place and return transfer both run; the block never teleports at the loop.
    const phase=manipulation<=.5?manipulation*2:2-manipulation*2;
    const {angles,jaw}=sample(phase);
    const calibration=structuredClone(defaults);
    names.forEach((name,index)=>calibration.joints.right[name]=degrees(angles[index]));
    calibration.joints.right.joint7=jaw;calibration.joints.right.joint8=-jaw;
    calibration.joints.left={joint2:5,joint7:18,joint8:-18};
    calibration.joints.center={joint1:0,joint2:40,joint3:-20,joint4:0,joint5:50,joint6:0};
    rig.pose(calibration);
    if(phase<.34){block.position.copy(pick);block.quaternion.copy(cubeRotation);}
    else if(phase<.78){
      const world=arm.links.link6.matrixWorld.clone().multiply(attachment);
      world.decompose(block.position,block.quaternion,new T.Vector3());
    }else{block.position.copy(place);block.quaternion.copy(cubeRotation);}
    aimHead(block.position,calibration);
    rig.pose(calibration);
    const hand=arm.links.link6.localToWorld(gripPoint.clone());
    const handLocal=base.worldToLocal(hand.clone());referenceHandLocal??=handLocal.clone();
    const handMotion=handLocal.sub(referenceHandLocal).applyQuaternion(initialBaseRotation);
    const headDirection=rig.arms.center.optical.getWorldDirection(new T.Vector3())
      .applyQuaternion(base.getWorldQuaternion(new T.Quaternion()).invert()).applyQuaternion(initialBaseRotation).normalize();
    const stage=progress<.17?'Position the mobile base':manipulation<=.5?(phase<.27?'Approach the block':phase<.34?'Close the gripper':phase<.74?'Lift and transfer':phase<.82?'Release the block':'Return the hand'):(phase>.82?'Approach the block':phase>.74?'Close the gripper':phase>.34?'Lift and return':phase>.27?'Release the block':'Return the hand');
    return {hand,handMotion,headDirection,reach:Math.sin(phase*Math.PI)**2,phase,calibration,mobile,stage};
  }
  update(0);
  return {update,keys,table,block,markers,surface,pick,place,sample,baseMotion,duration:24};
}
