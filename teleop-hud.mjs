import * as T from './vendor/three.module.min.js';

function poseInRobotFrame(rig,frame,point=new T.Vector3()) {
  const reference=rig.arms.center.root;
  reference.updateWorldMatrix(true,false);frame.updateWorldMatrix(true,false);
  const position=reference.worldToLocal(frame.localToWorld(point.clone()));position.z+=.25;
  const rotation=reference.getWorldQuaternion(new T.Quaternion()).invert().multiply(frame.getWorldQuaternion(new T.Quaternion()));
  const angles=new T.Euler().setFromQuaternion(rotation,'ZYX');
  return {position:position.toArray(),rpy:[angles.x,angles.y,angles.z].map(T.MathUtils.radToDeg)};
}
export function readTeleopPoses(rig) {
  return {
    head:poseInRobotFrame(rig,rig.arms.center.optical),
    left:poseInRobotFrame(rig,rig.arms.left.links.link6,new T.Vector3(0,0,.115)),
    right:poseInRobotFrame(rig,rig.arms.right.links.link6,new T.Vector3(0,0,.115)),
  };
}
export function createTeleopHud(mount,gear) {
  const root=document.createElement('section');root.id=mount?.id||'teleop-readout';root.className='teleop-readout';
  root.setAttribute('aria-label','Illustrative teleoperation pose readouts');
  root.innerHTML=`<div class="teleop-readout-heading"><strong>Live pose readouts</strong><span>Illustrative motion · robot-centric frame · XYZ in m / RPY in °</span></div><div class="teleop-pose-grid">${[['head','Head camera'],['left','Left EEF'],['right','Right EEF']].map(([id,label])=>`<div class="teleop-pose"><strong>${label}</strong><div class="teleop-values"><span>XYZ <output data-position="${id}" aria-live="off" aria-label="${label} position X Y Z in meters"><span></span><span></span><span></span></output></span><span>RPY <output data-rotation="${id}" aria-live="off" aria-label="${label} roll pitch yaw in degrees"><span></span><span></span><span></span></output></span></div></div>`).join('')}</div><div class="teleop-base"><strong>Mobile base</strong><output data-base aria-live="off" aria-label="Actual base displacement, forward velocity, yaw angle and yaw velocity"></output><span class="teleop-phase" data-phase></span></div><div class="teleop-control-key" aria-label="Quest controller mapping"><span data-button="X">X · turn left</span><span data-button="Y">Y · turn right</span><span data-button="A">A · reverse</span><span data-button="B">B · forward</span><small>Both grips: engage / re-anchor · Triggers: grippers</small></div>`;
  if(mount)mount.replaceWith(root);
  const fields={};root.querySelectorAll('output').forEach(element=>{fields[element.dataset.position?'p-'+element.dataset.position:element.dataset.rotation?'r-'+element.dataset.rotation:'base']=element;});
  const phase=root.querySelector('[data-phase]'),buttons=[...root.querySelectorAll('[data-button]')];
  const controllerButtons=Object.fromEntries(['A','B','X','Y'].map(key=>{
    const hand=key==='A'||key==='B'?0:1,mesh=gear.controllers[hand].getObjectByName(key.toLowerCase()+'_button');
    if(mesh?.isMesh){mesh.material=mesh.material.clone();return [key,mesh];}return [key,null];
  }));
  const signed=(value,places)=>{const rounded=Math.abs(value)<.5*10**(-places)?0:value;return `${rounded>=0?'+':''}${rounded.toFixed(places)}`;};
  function write(element,text){if(element.textContent!==text)element.textContent=text;}
  return {element:root,update(rig,state){
    const poses=readTeleopPoses(rig);
    for(const [id,pose] of Object.entries(poses)){
      pose.position.forEach((value,index)=>write(fields['p-'+id].children[index],signed(value,3)));
      pose.rpy.forEach((value,index)=>write(fields['r-'+id].children[index],signed(value,1)));
    }
    const {travel,yaw,forwardVelocity,yawVelocity,button}=state.mobile;
    write(fields.base,`Forward/back ${signed(travel*1000,0)} mm · v ${signed(forwardVelocity,3)} m/s | Yaw (+left) ${signed(T.MathUtils.radToDeg(yaw),1)}° · ω ${signed(T.MathUtils.radToDeg(yawVelocity),1)}°/s`);
    write(phase,state.stage);
    buttons.forEach(element=>element.classList.toggle('is-active',element.dataset.button===button));
    for(const[key,mesh]of Object.entries(controllerButtons))if(mesh){mesh.material.emissive.set(key===button?'#d29734':'#000000');mesh.material.emissiveIntensity=key===button?.75:0;}
  }};
}
