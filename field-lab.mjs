import * as T from './vendor/three.module.min.js';
import {createAmp, defaults} from './assets/robot-models/amp.mjs?v=20261104mast1';
import {createAmpParts} from './amp-parts.mjs?v=20261104mast1';
import {initViewpointDemo} from './viewpoint-demo.mjs?v=20261104mast1';

const $ = id => document.getElementById(id);
const vector = (x=0,y=0,z=0) => new T.Vector3(x,y,z);
function stage() {
  const scene = new T.Scene();
  scene.background = new T.Color('#e8e6e0');
  scene.fog = new T.Fog('#e8e6e0',6,15);
  scene.add(new T.HemisphereLight('#fafcff','#a8aaa4',2));
  const key = new T.DirectionalLight('#fff7ea',2.4);
  key.position.set(-3,6,4);scene.add(key);
  const floor = new T.GridHelper(20,50,'#a8aaa4','#c9c9c1');
  floor.position.y=-.012;scene.add(floor);
  return scene;
}
function renderer(canvas) {
  try {
    const result=new T.WebGLRenderer({canvas,antialias:true});
    result.setPixelRatio(Math.min(devicePixelRatio,1.75));return result;
  } catch {
    canvas.replaceWith(Object.assign(document.createElement('p'),{textContent:'Explore the hardware photograph and real demonstrations below.'}));return null;
  }
}
function inspect(canvas,view,draw) {
  let drag;
  canvas.style.touchAction='pan-y';canvas.style.cursor='grab';
  canvas.addEventListener('pointerdown',event=>{if(event.button)return;drag=[event.clientX,event.clientY];canvas.setPointerCapture(event.pointerId);canvas.style.cursor='grabbing';});
  canvas.addEventListener('pointermove',event=>{
    if(!drag)return;
    view.yaw-=(event.clientX-drag[0])*.006;
    view.pitch=T.MathUtils.clamp(view.pitch+(event.clientY-drag[1])*.005,-.06,1);
    drag=[event.clientX,event.clientY];draw();
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{drag=undefined;canvas.style.cursor='grab';});
  canvas.addEventListener('wheel',event=>{if(!event.ctrlKey)return;event.preventDefault();view.zoom=T.MathUtils.clamp(view.zoom*Math.exp(event.deltaY*.001),.65,1.5);draw();},{passive:false});
}
function whenVisible(element,initialize) {
  const observer=new IntersectionObserver((entries)=>{
    if(!entries.some(entry=>entry.isIntersecting))return;
    observer.disconnect();initialize();
  },{rootMargin:'250px'});observer.observe(element);
}

async function teleoperation() {
  const canvas=$('transfer-scene');const r=renderer(canvas);if(!r)return;
  const scene=stage(),camera=new T.PerspectiveCamera(36,1,.04,30);
  const hx=-.87,rx=.87;
  const [avatar,gear,rig,{createTeleopTask},{createTeleopHud}]=await Promise.all([
    import('./human-avatar.mjs?v=20261104polish6').then(module=>module.createHumanAvatar(hx)),
    import('./vr-gear.mjs?v=20261104k').then(module=>module.createQuestGear()),
    createAmp(),import('./teleop-task.mjs?v=20261104polish6'),import('./teleop-hud.mjs?v=20261104polish6')
  ]);
  scene.add(avatar.scene);
  const head=new T.Group();head.add(gear.headset);scene.add(head,...gear.controllers);
  rig.root.position.set(rx,0,-.22);rig.root.rotation.y=-Math.PI/2;
  scene.add(rig.root,...rig.frusta());
  const task=createTeleopTask(scene,rig),hud=createTeleopHud($('motion-play'),gear);
  const panel=document.createElement('div');panel.className='teleop-stage';
  const visual=document.createElement('div');visual.className='teleop-visual';
  const labels=canvas.previousElementSibling;
  labels.before(panel);visual.append(labels,canvas);panel.append(visual,hud.element);
  const axes=Array.from({length:6},()=>new T.AxesHelper(.12));scene.add(...axes);
  const view={yaw:.08,pitch:.24,zoom:1};
  const timeline=$('motion');let animation=0,lastTime;
  const note=$('transfer-note');
  note.innerHTML='Equipment assets: <a href="https://sketchfab.com/3d-models/oculus-quest-2-c6a1c2623d224a1bbb81a38915f7e898">Quest 2 by NosTeam · CC BY 4.0</a> · <a href="https://github.com/immersive-web/webxr-input-profiles/tree/main/packages/assets/profiles/oculus-touch-v3">WebXR Touch controllers · MIT</a>';
  function draw() {
    const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;
    r.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
    const distance=Math.max(3.2,5.2/camera.aspect)*view.zoom;
    camera.position.set(Math.sin(view.yaw)*Math.cos(view.pitch)*distance,.98+Math.sin(view.pitch)*distance,Math.cos(view.yaw)*Math.cos(view.pitch)*distance);
    camera.lookAt(0,.98,0);
    const progress=Number(timeline.value)/100,state=task.update(progress);
    const movement=state.handMotion;
    const handTargets=[vector(hx-.25+movement.x,1.05+movement.y,.31+movement.z),vector(hx+.25,1.07,.26)];
    const pose=avatar.pose({reach:.12,lift:state.reach,turn:0,handTargets,holdingControllers:true,headLookDirection:state.headDirection});
    head.position.copy(pose.headPosition);head.quaternion.copy(pose.headRotation);head.updateMatrixWorld(true);
    const frames=[{position:head.localToWorld(vector(0,.035,.13)),rotation:pose.headRotation},...pose.hands];
    pose.controllerGrips.forEach((grip,index)=>{gear.controllers[index].position.copy(grip.position);gear.controllers[index].quaternion.copy(grip.rotation);});
    frames.forEach((frame,index)=>{axes[index].position.copy(frame.position);axes[index].quaternion.copy(frame.rotation);});
    ['center','right','left'].forEach((name,index)=>{
      const frame=name==='center'?rig.arms[name].optical:rig.arms[name].links.link6;
      frame.getWorldPosition(axes[index+3].position);frame.getWorldQuaternion(axes[index+3].quaternion);
    });
    hud.update(rig,state);r.render(scene,camera);
  }
  let inView=false,userPaused=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function pause(){cancelAnimationFrame(animation);animation=0;lastTime=undefined;}
  function start(){if(animation||document.hidden)return;lastTime=undefined;animation=requestAnimationFrame(tick);}
  function tick(now){if(lastTime!==undefined)timeline.value=(Number(timeline.value)+(now-lastTime)/(task.duration*10))%100;lastTime=now;draw();animation=requestAnimationFrame(tick);}
  timeline.oninput=()=>{userPaused=true;pause();draw();};
  canvas.tabIndex=0;canvas.setAttribute('aria-keyshortcuts','Space');
  canvas.addEventListener('keydown',event=>{if(event.code!=='Space')return;event.preventDefault();userPaused=!userPaused;if(userPaused)pause();else start();});
  new IntersectionObserver(([entry])=>{inView=entry.isIntersecting&&entry.intersectionRatio>=.25;if(inView&&!userPaused&&!reduced.matches)start();else if(!inView){userPaused=false;pause();}},{threshold:[0,.25]}).observe(canvas);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else if(inView&&!userPaused&&!reduced.matches)start();});
  inspect(canvas,view,draw);new ResizeObserver(draw).observe(canvas);draw();
}

async function hardwareAssembly() {
  const section=$('assembly'),canvas=$('assembly-scene');
  const comparison=document.createElement('div');comparison.className='amp-comparison';
  const mount=document.createElement('section');const title=document.createElement('h4');title.textContent='AMP mounting view';
  canvas.before(comparison);mount.append(title,canvas);comparison.append(mount,createAmpParts());
  const r=renderer(canvas);if(!r)return;
  const rig=await createAmp(),scene=stage(),camera=new T.PerspectiveCamera(36,1,.03,30);
  rig.pose(structuredClone(defaults));scene.add(rig.root,...rig.frusta());
  const view={yaw:.67,pitch:.29,zoom:1};
  function draw(){
    const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;
    r.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
    const radius=2.8*view.zoom*Math.max(1,.9/camera.aspect);
    camera.position.set(radius*Math.cos(view.pitch)*Math.sin(view.yaw),.85+radius*Math.sin(view.pitch),radius*Math.cos(view.pitch)*Math.cos(view.yaw));
    camera.lookAt(.1,.85,0);r.render(scene,camera);
  }
  inspect(canvas,view,draw);new ResizeObserver(draw).observe(canvas);draw();
}
initViewpointDemo();
whenVisible($('transfer-scene'),()=>teleoperation().catch(error=>{console.error(error);$('transfer-note').textContent='The real hardware is shown in the photograph above.';}));
whenVisible($('assembly'),()=>hardwareAssembly().catch(console.error));
const replayMount=$('task-replay');
if(replayMount)whenVisible(replayMount,()=>import('./recorded-replay.mjs?v=20261104polish6').then(module=>module.initRecordedReplay(replayMount,{episodeIndex:2})).catch(error=>{console.error(error);replayMount.textContent='The recording could not load.';}));
