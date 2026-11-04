import * as T from './vendor/three.module.min.js';
import {createAmp, defaults, persistCalibration, savedCalibration, shortFrustum} from './assets/robot-models/amp.mjs?v=20261103e';
import {createAmpParts} from './amp-parts.mjs?v=20261103e';
import {initViewpointDemo} from './viewpoint-demo.mjs?v=20261103e';
const $=id=>document.getElementById(id);
const v=(x,y,z)=>new T.Vector3(x,y,z);
const material=(color,metalness=.12)=>new T.MeshStandardMaterial({color,metalness,roughness:.58});
const joint=material(0x303a42,.32), targetMaterial=material(0x639653);
const worktop=material(0xa68158,.05), tableFrame=material(0x4d565b,.3);
function box(w,h,d,mat,x=0,y=0,z=0){const o=new T.Mesh(new T.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);return o;}
function sphere(r,mat){return new T.Mesh(new T.SphereGeometry(r,16,12),mat);}
function scene(){
 const s=new T.Scene();s.background=new T.Color(0xe8e6e0);
 s.fog=new T.Fog(0xe8e6e0,5,13);
 s.add(new T.HemisphereLight(0xf7f7f4,0xb2aaa0,1.9));
 const key=new T.DirectionalLight(0xfff7e8,2.15);key.position.set(-3,7,5);s.add(key);
 const floor=new T.Mesh(new T.PlaneGeometry(40,40),new T.MeshBasicMaterial({color:0xd9d7d0}));
 floor.rotation.x=-Math.PI/2;floor.position.y=-.019;s.add(floor);
 const grid=new T.GridHelper(24,48,0xb0aea6,0xc2c0b8);grid.position.y=-.012;s.add(grid);
 return s;
}
function renderer(id){
 try{const r=new T.WebGLRenderer({canvas:$(id),antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,2));return r;}
 catch{$(id).replaceWith(Object.assign(document.createElement('p'),{className:'scene-fallback',textContent:'This 3D view needs WebGL. The real robot demonstrations are available below.'}));return null;}
}
function capsule(r,length,mat,x,y,z,stretch=1){
 const mesh=new T.Mesh(new T.CapsuleGeometry(r,length,8,16),mat);
 mesh.position.set(x,y,z);mesh.scale.z=stretch;return mesh;
}
function transfer(){
 const r=renderer('transfer-scene');if(!r)return;
 const s=scene(),camera=new T.PerspectiveCamera(38,1,.05,45);
 const hx=-.95,rx=.95,visorMat=material(0xe7e8e5);
 const head=new T.Group();
 const cap=sphere(.092,joint);cap.scale.set(1,.49,1.08);cap.position.set(0,.116,-.015);
 const capBrim=box(.148,.013,.092,joint,0,.106,.072);
 const egoCam=box(.053,.038,.031,visorMat,0,.129,.097);
 head.add(cap,capBrim,egoCam);s.add(head);
 let gear;
 const humanFrusta=[shortFrustum(),shortFrustum(),shortFrustum()];s.add(...humanFrusta.map(f=>f.helper));
 const axes=[...Array(6)].map(()=>new T.AxesHelper(.15));s.add(...axes);
 const timeline=$('motion');let mode=0,animation=0,rig,human,calibration=savedCalibration();
 const fallback=$('transfer-note');
 const credit=document.createElement('p');credit.className='quiet';credit.style.fontSize='.75rem';
 credit.innerHTML='Quest 2 model: <a href="https://sketchfab.com/3d-models/oculus-quest-2-c6a1c2623d224a1bbb81a38915f7e898" target="_blank" rel="noopener">NosTeam</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. Controllers: <a href="https://github.com/immersive-web/webxr-input-profiles/tree/main/packages/assets/profiles/oculus-touch-v3" target="_blank" rel="noopener">WebXR Input Profiles</a> · MIT. Drag to orbit, scroll to zoom.';
 fallback.after(credit);
 new IntersectionObserver((entries, observer)=>{
  if(!entries.some(entry=>entry.isIntersecting))return;
  observer.disconnect();
  import('./human-avatar.mjs').then(({createHumanAvatar})=>createHumanAvatar(hx)).then(avatar=>{
   human=avatar;s.add(avatar.scene);draw();
  }).catch(error=>{fallback.textContent='The human model could not load.';console.error(error);});
  import('./vr-gear.mjs?v=quest2fit4').then(({createQuestGear})=>createQuestGear()).then(models=>{
   gear=models;head.add(gear.headset);s.add(...gear.controllers);draw();
  }).catch(error=>{credit.textContent='The Quest 2 assets could not load. The actual equipment is shown in the hardware photograph above.';console.error(error);});
 },{rootMargin:'180px'}).observe(r.domElement);
 createAmp().then(model=>{
  rig=model;rig.root.position.set(rx,0,-.34);rig.root.rotation.y=-Math.PI/2;
  s.add(rig.root,...rig.frusta());draw();
 }).catch(error=>{console.error(error);});
 document.addEventListener('amp-calibration',()=>{calibration=savedCalibration();draw();});
 const props=[box(.045,.045,.045,targetMaterial,hx-.095,.900,.345),box(.045,.045,.045,targetMaterial,rx-.13,.900,.24)];s.add(...props);
 for(const x of [hx,rx]){
  s.add(box(.83,.05,.45,worktop,x,.852,.41));
  for(const dx of [-.37,.37])for(const dz of [-.19,.19])s.add(box(.043,.83,.043,tableFrame,x+dx,.415,.41+dz));
 }
 const view={yaw:.025,pitch:.345,zoom:1};
 const canvas=r.domElement;canvas.style.touchAction='none';canvas.style.cursor='grab';
 let drag;
 canvas.addEventListener('pointerdown',event=>{if(event.button!==0)return;drag={x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);canvas.style.cursor='grabbing';});
 canvas.addEventListener('pointermove',event=>{if(!drag)return;view.yaw-=(event.clientX-drag.x)*.006;view.pitch=T.MathUtils.clamp(view.pitch+(event.clientY-drag.y)*.005,.06,1.2);drag={x:event.clientX,y:event.clientY};draw();});
 const endDrag=()=>{drag=null;canvas.style.cursor='grab';};
 canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
 canvas.addEventListener('wheel',event=>{event.preventDefault();view.zoom=T.MathUtils.clamp(view.zoom*Math.exp(event.deltaY*.001),.55,1.8);draw();},{passive:false});
 canvas.addEventListener('dblclick',()=>{Object.assign(view,{yaw:.025,pitch:.345,zoom:1});draw();});
 function draw(){
  const w=r.domElement.clientWidth,h=r.domElement.clientHeight;if(!w||!h)return;
  r.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  const distance=Math.max(3.43,4.9/camera.aspect)*view.zoom;
  camera.position.set(Math.sin(view.yaw)*Math.cos(view.pitch)*distance,.91+Math.sin(view.pitch)*distance,Math.cos(view.yaw)*Math.cos(view.pitch)*distance);camera.lookAt(0,.91,0);
  const progress=+timeline.value;
  const ease=(start,end)=>T.MathUtils.smoothstep(progress,start,end);
  const reach=ease(9,37)*(1-ease(75,96));
  const lift=ease(38,59)*(1-ease(62,77));
  const turn=-.21*ease(3,27)*(1-ease(72,94));
  const attached=ease(34,43)*(1-ease(75,85));
  const humanObject=v(hx-.095,.900+lift*.15,.345);
  props[0].position.copy(humanObject);props[1].position.set(rx-.13,.900+lift*.15,.24);
  props.forEach(o=>o.quaternion.identity());
  head.visible=!!human;
  if(gear){gear.headset.visible=!mode;gear.controllers.forEach(o=>o.visible=!mode&&!!human);}
  [cap,capBrim,egoCam].forEach(o=>o.visible=!!mode);
  function trackHuman(index,position,orientation){
   axes[index].position.copy(position);axes[index].quaternion.copy(orientation);
   const tracker=humanFrusta[index].camera;
   tracker.position.copy(position);tracker.quaternion.copy(orientation);
   tracker.rotateY(Math.PI);tracker.updateMatrixWorld(true);
  }
  axes.slice(0,3).forEach(o=>o.visible=!!human);
  humanFrusta.forEach(f=>f.helper.visible=!!human);
  if(human){
   const pose=human.pose({reach,lift,turn,object:humanObject});
   head.position.copy(pose.headPosition);head.quaternion.copy(pose.headRotation);head.updateMatrixWorld(true);
   const headPosition=mode?egoCam.getWorldPosition(v()):head.localToWorld(v(0,.048,.140));
   trackHuman(0,headPosition,head.quaternion);
   pose.hands.forEach(({position,rotation},i)=>{
    if(gear){gear.controllers[i].position.copy(position);gear.controllers[i].quaternion.copy(rotation);}
    trackHuman(i+1,position,rotation);
   });
   const grasp=pose.hands[0];
   const contact=v(0,-.012,.032).applyQuaternion(grasp.rotation).add(grasp.position);
   props[0].position.lerp(contact,attached);props[0].quaternion.slerp(grasp.rotation,attached);
  }
  if(rig){
   const joints=Object.fromEntries(Object.entries(calibration.joints).map(([name,values])=>[name,{...values}]));
   const pickPose={joint1:24,joint2:76.5,joint3:-39.5,joint4:-37.5,joint5:-7};
   const liftOffsets={joint1:3,joint2:-9.5,joint3:-14,joint4:-24.5,joint5:8};
   const right=joints.right;
   for(const [id,angle] of Object.entries(pickPose))right[id]=T.MathUtils.lerp(right[id]??0,angle,reach)+lift*liftOffsets[id];
   // The cube is 45 mm wide; retain a corresponding gap while it is held.
   const gripOpening=reach*(1-T.MathUtils.smoothstep(progress,33,44));
   right.joint7=T.MathUtils.lerp(0,32,gripOpening)+attached*20;
   right.joint8=-right.joint7;
   joints.left.joint1=(joints.left.joint1??0)-reach*9;
   joints.center.joint1=(joints.center.joint1??0)+turn*60;
   joints.center.joint2=(joints.center.joint2??0)+reach*16;
   rig.pose({...calibration,joints});
   const tool=rig.arms.right.links.link6;
   const contact=tool.localToWorld(v(0,0,.172));
   props[1].position.lerp(contact,attached);props[1].quaternion.slerp(tool.getWorldQuaternion(new T.Quaternion()),attached);
   for(const [index,name] of ['center','left','right'].entries()){
    const frame=name==='center'?rig.arms[name].optical:rig.arms[name].links.link6;
    frame.getWorldPosition(axes[index+3].position);frame.getWorldQuaternion(axes[index+3].quaternion);
   }
  }
  axes.slice(3).forEach(o=>o.visible=!!rig);r.render(s,camera);
 }
 function select(n){mode=n;$('human-label').textContent=n?'Human / egocentric camera + hand frames':'Human / Quest 2 + controllers';
  $('transfer-note').textContent=n?'Egocentric head and wrist trajectories supply training signals for the robot policy.':'Head tracking guides the camera, and controller tracking guides the two grippers.';
  $('tele-mode').setAttribute('aria-pressed',String(!n));$('ego-mode').setAttribute('aria-pressed',String(!!n));draw();}
 function stop(){cancelAnimationFrame(animation);animation=0;$('motion-play').textContent='Play motion';}
 $('tele-mode').onclick=()=>select(0);$('ego-mode').onclick=()=>select(1);timeline.oninput=()=>{stop();draw();};
 $('motion-play').onclick=()=>{if(animation){stop();return;}$('motion-play').textContent='Pause motion';const start=performance.now(),from=+timeline.value;
 function tick(now){timeline.value=(from+(now-start)/55)%100;draw();animation=requestAnimationFrame(tick);}animation=requestAnimationFrame(tick);};
 new ResizeObserver(draw).observe(r.domElement);select(0);
}

initViewpointDemo();transfer();
const replayMount = document.getElementById('backpack-replay');
if (replayMount) {
 const replayObserver = new IntersectionObserver((entries,observer)=>{
  if (!entries.some(entry=>entry.isIntersecting)) return;
  observer.disconnect();
  import('./recorded-replay.mjs?v=20261103e').then(({initRecordedReplay})=>initRecordedReplay(replayMount)).catch(error=>{
   replayMount.textContent='The recording could not load.';console.error(error);
  });
 },{rootMargin:'200px'});
 replayObserver.observe(replayMount);
}


async function assembly(){
 const details=$('assembly');
 if(!details)return;
 const previous=$('pillar-height');
 if(previous){details.querySelector('label[for="pillar-height"]')?.remove();previous.remove();}
 const status=document.createElement('p');
 status.textContent='The 300 mm mast sits on the retained stock lower support, centered on its mounting axis.';
 const introduction=details.querySelector('p');
 if(introduction)introduction.textContent='Drag to orbit. Adjust the mount and joints to match the physical robot.';
 details.append(status);
 let initialized=false;
 async function initialize(){
  if(!details.open||initialized)return;
  initialized=true;
  const comparison=document.createElement('div');
  comparison.className='amp-comparison';
  const preview=document.createElement('section');
  const title=document.createElement('h4');
  title.textContent='AMP mounting preview';
  const canvas=$('assembly-scene');
  canvas.before(comparison);
  preview.append(title,canvas);
  comparison.append(preview,createAmpParts());
  const r=renderer('assembly-scene');
  if(!r)return;
  const message=document.createElement('output');
  message.setAttribute('aria-live','polite');
  status.append(' ',message);
  message.textContent='Loading vendor meshes…';
  try{
   const rig=await createAmp();
   const s=scene(),camera=new T.PerspectiveCamera(38,1,.04,40);
   s.add(rig.root,...rig.frusta());
   let settings=savedCalibration(),az=.67,tilt=.30,drag;
   const controls=document.createElement('div');controls.className='amp-adjust';
   const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./amp-controls.css?v=20261103e',import.meta.url);document.head.append(css);
   const inputs=[];
   function draw(){
    const w=r.domElement.clientWidth,h=r.domElement.clientHeight;
    if(!w||!h)return;
    r.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    const radius=4.65/settings.zoom*Math.max(1,.9/camera.aspect);
    camera.position.set(radius*Math.cos(tilt)*Math.sin(az),.79+radius*Math.sin(tilt),radius*Math.cos(tilt)*Math.cos(az));
    camera.lookAt(.12,.85,0);
    rig.pose(settings);
    r.render(s,camera);
   }
   function fieldset(title){
    const field=document.createElement('fieldset'),legend=document.createElement('legend');
    legend.textContent=title;field.append(legend);controls.append(field);return field;
   }
   function numeric(group,title,path,min,max,step,steppers=false){
    const label=document.createElement('label'),name=document.createElement('span');
    name.textContent=title;
    const input=document.createElement('input');
    input.type='number';input.min=min;input.max=max;input.step=step;
    const accessibleTitle=group.querySelector('legend').textContent+' '+title;
    input.setAttribute('aria-label',accessibleTitle);
    const row=document.createElement('span');row.className='amp-step';
    const read=()=>path.reduce((value,key)=>value[key],settings)??0;
    function apply(value){
     if(!Number.isFinite(value))return;
     const bounded=Math.max(min,Math.min(max,Number(value.toFixed(2))));
     path.slice(0,-1).reduce((value,key)=>value[key],settings)[path.at(-1)]=bounded;
     input.value=bounded;
     message.textContent=persistCalibration(settings)?'Saved in this browser.':'Browser storage is unavailable. Export this calibration to keep it.';
     draw();
     document.dispatchEvent(new Event('amp-calibration'));
    }
    function stepper(direction){
     const button=document.createElement('button');
     button.type='button';button.textContent=direction<0?'−':'+';
     button.setAttribute('aria-label',(direction<0?'Decrease ':'Increase ')+accessibleTitle);
     button.onclick=()=>apply(read()+direction*step);return button;
    }
    input.value=read();input.addEventListener('change',()=>{if(input.value==='')input.value=read();else apply(input.valueAsNumber);});
    inputs.push(()=>{input.value=read();});
    if(steppers)row.append(stepper(-1),input,stepper(1));
    else row.append(input);
    label.append(name,row);group.append(label);
   }
   const mount=fieldset('Mount and view');
   numeric(mount,'Zoom (×)',['zoom'],.65,3.8,.05,true);
   numeric(mount,'Mast height (mm)',['pillarMm'],80,650,5);
   numeric(mount,'Center fore / aft X (mm)',['offset','x'],-250,250,5,true);
   numeric(mount,'Center lateral Y (mm)',['offset','y'],-250,250,5,true);
   for(const [name,arm] of Object.entries(rig.arms)){
    const group=fieldset(name[0].toUpperCase()+name.slice(1)+' PiPER');
    numeric(group,'Base yaw about Z (°)',['yaw',name],-180,180,5,true);
    for(const [id,joint] of Object.entries(arm.joints)){
     const slide=joint.type==='slide';
     if(slide&&name==='center')continue;
     const units=slide?1000:180/Math.PI;
     const label=slide?'Finger '+id.slice(-1)+' (mm)':'J'+id.slice(-1)+' (°)';
     const [min,max]=joint.range.map(value=>Number((value*units).toFixed(1)));
     numeric(group,label,['joints',name,id],min,max,slide?1:5,true);
    }
   }
   const actions=document.createElement('div');actions.className='amp-actions';
   const reset=document.createElement('button'),save=document.createElement('button');
   reset.type=save.type='button';reset.textContent='Reset calibration';save.textContent='Export calibration';
   reset.onclick=()=>{
    settings=structuredClone(defaults);
    persistCalibration(settings);inputs.forEach(refresh=>refresh());draw();
    document.dispatchEvent(new Event('amp-calibration'));
    message.textContent='Defaults restored.';
   };
   save.onclick=()=>{
    const url=URL.createObjectURL(new Blob([JSON.stringify({yawUnit:'degrees',offsetUnit:'mm',hingeUnit:'degrees',fingerUnit:'mm',...settings},null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='amp-calibration.json';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
   };
   actions.append(reset,save,message);controls.append(actions);details.append(controls);message.textContent='';
   const surface=r.domElement;
   surface.addEventListener('pointerdown',event=>{drag=[event.clientX,event.clientY];surface.setPointerCapture(event.pointerId);});
   surface.addEventListener('pointermove',event=>{
    if(!drag)return;
    az-=(event.clientX-drag[0])*.009;
    tilt=Math.min(1.2,Math.max(-.22,tilt+(event.clientY-drag[1])*.007));
    drag=[event.clientX,event.clientY];draw();
   });
   for(const event of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(event,()=>{drag=undefined;});
   new ResizeObserver(draw).observe(surface);draw();
  }catch(error){message.textContent='Could not load the vendor geometry.';console.error(error);}
 }
 details.addEventListener('toggle',initialize);
 function openFromLink(){if(location.hash==='#assembly')details.open=true;}
 window.addEventListener('hashchange',openFromLink);
 openFromLink();
 initialize();
}
assembly();
