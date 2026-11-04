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
  // The table shares the rig’s outer Y-up frame and stays clear of its fixed platform.
  rig.root.add(table);
  const block=new T.Mesh(new T.BoxGeometry(.045,.062,.045),new T.MeshStandardMaterial({color:'#257f9b',roughness:.56}));
  root.add(block);
  const markerMaterial=new T.MeshStandardMaterial({color:'#e5d5b7',roughness:.88});
  const markers=[[-.23,.53],[-.07,.55]].map(([y,x])=>{
    const disk=new T.Mesh(new T.CylinderGeometry(.065,.065,.002,40),markerMaterial);
    // rig.root uses Y-up before the chassis's inner Z-up conversion.
    disk.position.set(x,surface+.001,-y);rig.root.add(disk);return disk;
  });

  const arm=rig.arms.right;
  const base=rig.root;
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
  function update(progress) {
    // Run the return transfer as well, keeping the block continuous across the loop.
    const phase=progress<=.5?progress*2:2-progress*2;
    const {angles,jaw}=sample(phase);
    const calibration=structuredClone(defaults);
    names.forEach((name,index)=>calibration.joints.right[name]=degrees(angles[index]));
    calibration.joints.right.joint7=jaw;calibration.joints.right.joint8=-jaw;
    calibration.joints.left={joint2:5,joint7:18,joint8:-18};
    calibration.joints.center={joint1:8*Math.sin(phase*Math.PI*2),joint2:31,joint3:-39,joint5:25};
    rig.pose(calibration);
    if(phase<.34) {block.position.copy(pick);block.quaternion.copy(cubeRotation);}
    else if(phase<.78){
      const world=arm.links.link6.matrixWorld.clone().multiply(attachment);
      world.decompose(block.position,block.quaternion,new T.Vector3());
    }else{block.position.copy(place);block.quaternion.copy(cubeRotation);}
    return {hand:arm.links.link6.localToWorld(gripPoint.clone()),reach:Math.sin(phase*Math.PI)**2,phase,calibration};
  }
  update(0);
  return {update,keys,table,block,surface,pick,place,sample};
}
