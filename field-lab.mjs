import * as T from './vendor/three.module.min.js';
import {createAmp, defaults} from './assets/robot-models/amp.mjs?v=20261104slots1';
import {createAmpParts} from './amp-parts.mjs?v=20261104component-orbit1';
import {initViewpointDemo} from './viewpoint-demo.mjs?v=20261104controls1';

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

function autoOrbit(canvas,view,draw) {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let visible=false,dragging=false,frame=0,timer=0,lastTime,resumeAt=0;
  function pause(){cancelAnimationFrame(frame);clearTimeout(timer);frame=0;timer=0;lastTime=undefined;}
  function allowed(){return visible&&!document.hidden&&!reduced.matches&&!dragging;}
  function tick(now){
    if(!allowed()){pause();return;}
    const dt=lastTime===undefined?0:Math.min((now-lastTime)/1000,.05);lastTime=now;
    view.yaw=(view.yaw+dt*.10)%(Math.PI*2);draw();frame=requestAnimationFrame(tick);
  }
  function sync(){
    pause();if(!allowed())return;
    const delay=resumeAt-performance.now();
    if(delay>0)timer=setTimeout(sync,delay);else frame=requestAnimationFrame(tick);
  }
  canvas.addEventListener('pointerdown',event=>{if(event.button)return;dragging=true;pause();});
  function release(){if(!dragging)return;dragging=false;resumeAt=performance.now()+4000;sync();}
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,release);
  canvas.addEventListener('wheel',event=>{if(event.ctrlKey){resumeAt=performance.now()+4000;sync();}},{passive:true});
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting&&entry.intersectionRatio>=.15;sync();},{threshold:[0,.15]}).observe(canvas);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)dragging=false;sync();});
  reduced.addEventListener('change',sync);
}

async function teleoperation() {
  const canvas=$('transfer-scene');const r=renderer(canvas);if(!r)return;
  const scene=stage(),camera=new T.PerspectiveCamera(36,1,.04,30);
  const hx=-.87,rx=.87;
  const [avatar,gear,rig,{createTeleopTask},{createTeleopHud}]=await Promise.all([
    import('./human-avatar.mjs?v=20261104shorts1').then(module=>module.createHumanAvatar(hx)),
    import('./vr-gear.mjs?v=20261104k').then(module=>module.createQuestGear()),
    createAmp(),import('./teleop-task.mjs?v=20261104motion2'),import('./teleop-hud.mjs?v=20261104polish6')
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
  const replay=$('teleop-replay');
  let egg,eggTime=0,eggSaved,eggLoading=false;
  const timelineLabel=timeline.previousElementSibling;
  const timelineHeading=document.createElement('div');timelineHeading.className='teleop-timeline-heading';
  const surprise=document.createElement('button');surprise.type='button';surprise.className='teleop-surprise';
  function setSurpriseState(playing=false){
    surprise.innerHTML=`<span class="teleop-surprise-icon" aria-hidden="true">${playing?'↩':'🥊'}</span><span>${playing?'Back to demo':'Click to try a <span class="teleop-task-name">mobile manipulation task</span>'}</span>`;
    surprise.classList.toggle('is-playing',playing);
    surprise.title=playing?'Back to teleoperation':'Click to try a mobile manipulation task';
    surprise.setAttribute('aria-label',playing?'Return to the teleoperation demonstration':'Click to try a mobile manipulation task');
  }
  setSurpriseState();
  timelineLabel.before(timelineHeading);timelineHeading.append(surprise,timelineLabel);
  const normalProps=[task.table,task.block,...task.markers];
  const note=$('transfer-note');
  note.innerHTML='Equipment assets: <a href="https://sketchfab.com/3d-models/oculus-quest-2-c6a1c2623d224a1bbb81a38915f7e898">Quest 2 by NosTeam · CC BY 4.0</a> · <a href="https://github.com/immersive-web/webxr-input-profiles/tree/main/packages/assets/profiles/oculus-touch-v3">WebXR Touch controllers · MIT</a>';
  function draw() {
    const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;
    r.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
    const special=Boolean(egg?.active),progress=Number(timeline.value)/100;
    const state=special?egg.update(eggTime):task.update(progress);
    const blend=special?T.MathUtils.smoothstep(eggTime,0,.65)*(1-T.MathUtils.smoothstep(eggTime,egg.duration-.8,egg.duration)):0;
    const target=vector(0,.98,0);
    if(special)target.lerp(egg.framing.target,blend);
    const normalDistance=Math.max(3.2,5.2/camera.aspect);
    const wideDistance=special?Math.max(egg.framing.distance,egg.framing.distance*1.6/camera.aspect):normalDistance;
    const distance=T.MathUtils.lerp(normalDistance,wideDistance,blend)*view.zoom;
    camera.position.copy(target).add(vector(Math.sin(view.yaw)*Math.cos(view.pitch)*distance,Math.sin(view.pitch)*distance,Math.cos(view.yaw)*Math.cos(view.pitch)*distance));
    camera.lookAt(target);
    const movement=state.handMotion.clone();if(special)movement.clampLength(0,.20);
    const handTargets=[vector(hx-.25+movement.x,1.05+movement.y,.31+movement.z),vector(hx+.25,1.07,.26)];
    if(special)handTargets[0].add(vector(.04,.08,.17).multiplyScalar(state.operatorPunch??0));
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
  let inView=false,userPaused=false,scrubbing=false,explicitPlayback=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const motionAllowed=()=>!reduced.matches||explicitPlayback||egg?.active;
  function pause(){cancelAnimationFrame(animation);animation=0;lastTime=undefined;}
  function start(){if(animation||document.hidden)return;lastTime=undefined;animation=requestAnimationFrame(tick);}
  function finishEgg(){
    if(!eggSaved)return;
    egg.stop();normalProps.forEach((object,index)=>object.visible=eggSaved.visibility[index]);
    timeline.value=eggSaved.progress;timeline.disabled=false;userPaused=eggSaved.paused;
    Object.assign(view,eggSaved.view);eggSaved=undefined;eggTime=0;lastTime=undefined;
    timelineLabel.textContent='Teleoperation timeline';setSurpriseState();
  }
  function tick(now){
    if(lastTime!==undefined){
      if(egg?.active){eggTime+=(now-lastTime)/1000;if(eggTime>=egg.duration)finishEgg();}
      else timeline.value=(Number(timeline.value)+(now-lastTime)/(task.duration*10))%100;
    }
    lastTime=now;draw();
    if(inView&&!document.hidden&&!userPaused&&!scrubbing&&motionAllowed())animation=requestAnimationFrame(tick);else pause();
  }
  surprise.addEventListener('click',async()=>{
    if(eggLoading)return;
    if(egg?.active){pause();finishEgg();draw();if(inView&&!userPaused&&motionAllowed())start();return;}
    eggLoading=true;surprise.disabled=true;replay.disabled=true;
    try {
      egg??=await (await import('./teleop-easter-egg.mjs?v=20261104punch1')).createTeleopEasterEgg({scene,rig});
      if(document.hidden)return;
      // The button sits below the stacked readouts on narrow screens. Bring the
      // actual scene into view before playing the explicitly requested vignette.
      canvas.scrollIntoView({block:'center',behavior:'instant'});
      const bounds=canvas.getBoundingClientRect();
      inView=(Math.min(innerHeight,bounds.bottom)-Math.max(0,bounds.top))/bounds.height>=.25;
      if(!inView)return;
      pause();eggSaved={progress:timeline.value,paused:userPaused,view:{...view},visibility:normalProps.map(object=>object.visible)};
      eggTime=0;egg.start();userPaused=false;normalProps.forEach(object=>object.visible=false);timeline.disabled=true;
      timelineLabel.textContent='Cartoon interlude · Esc to return';setSurpriseState(true);draw();start();
    } catch(error){console.error(error);finishEgg();draw();}
    finally {eggLoading=false;surprise.disabled=false;replay.disabled=false;}
  });
  // Scrubbing is a temporary hold, rather than a hidden permanent pause.
  function finishScrub(){
    scrubbing=false;userPaused=false;explicitPlayback=true;lastTime=undefined;
    if(inView&&!document.hidden)start();
  }
  timeline.addEventListener('pointerdown',()=>{scrubbing=true;pause();});
  timeline.addEventListener('input',()=>{pause();draw();});
  timeline.addEventListener('change',finishScrub);
  for(const event of ['pointerup','pointercancel'])window.addEventListener(event,()=>{if(scrubbing)finishScrub();});
  replay.disabled=false;
  replay.addEventListener('click',()=>{
    pause();if(egg?.active)finishEgg();
    timeline.value=0;scrubbing=false;userPaused=false;explicitPlayback=true;draw();
    if(inView&&!document.hidden)start();
  });
  canvas.tabIndex=0;canvas.setAttribute('aria-keyshortcuts','Space Escape');
  canvas.addEventListener('keydown',event=>{if(event.code!=='Space')return;event.preventDefault();userPaused=!userPaused;if(userPaused)pause();else {explicitPlayback=true;start();}});
  $('transfer').addEventListener('keydown',event=>{if(event.code==='Escape'&&egg?.active){event.preventDefault();pause();finishEgg();draw();if(inView&&!userPaused&&motionAllowed())start();}});
  new IntersectionObserver(([entry])=>{inView=entry.isIntersecting&&entry.intersectionRatio>=.25;if(inView&&!userPaused&&!scrubbing&&motionAllowed())start();else if(!inView){if(egg?.active)finishEgg();scrubbing=false;userPaused=false;pause();}},{threshold:[0,.25]}).observe(canvas);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){scrubbing=false;pause();}else if(inView&&!userPaused&&motionAllowed())start();});
  inspect(canvas,view,draw);new ResizeObserver(draw).observe(canvas);draw();
}

async function hardwareAssembly() {
  const section=$('assembly'),canvas=$('assembly-scene');
  const comparison=document.createElement('div');comparison.className='amp-comparison';
  const mount=document.createElement('section');const title=document.createElement('h4');title.textContent='AMP mounting view';
  const hint=document.createElement('span');hint.className='amp-orbit-hint';hint.textContent='↔ Drag to rotate';
  const heading=document.createElement('div');heading.className='amp-mount-heading';heading.append(title,hint);
  canvas.setAttribute('aria-label','AMP robot setup. Drag to rotate and inspect the mounting.');
  canvas.before(comparison);mount.append(heading,canvas);comparison.append(mount,createAmpParts());
  const r=renderer(canvas);if(!r)return;
  const rig=await createAmp(),scene=stage(),camera=new T.PerspectiveCamera(36,1,.03,30);
  rig.pose(structuredClone(defaults));scene.add(rig.root,...rig.frusta());
  const view={yaw:.67,pitch:.29,zoom:1};
  let renderedWidth=0,renderedHeight=0;
  function draw(){
    const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;
    if(width!==renderedWidth||height!==renderedHeight){
      r.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
      renderedWidth=width;renderedHeight=height;
    }
    const radius=2.8*view.zoom*Math.max(1,.9/camera.aspect);
    camera.position.set(radius*Math.cos(view.pitch)*Math.sin(view.yaw),.85+radius*Math.sin(view.pitch),radius*Math.cos(view.pitch)*Math.cos(view.yaw));
    camera.lookAt(.1,.85,0);r.render(scene,camera);
  }
  inspect(canvas,view,draw);autoOrbit(canvas,view,draw);new ResizeObserver(draw).observe(canvas);draw();
}
initViewpointDemo();
whenVisible($('transfer-scene'),()=>teleoperation().catch(error=>{console.error(error);$('transfer-note').textContent='The real hardware is shown in the photograph above.';}));
whenVisible($('assembly'),()=>hardwareAssembly().catch(console.error));
const replayMount=$('task-replay');
if(replayMount)whenVisible(replayMount,()=>import('./recorded-replay.mjs?v=20261104speed15c').then(module=>module.initRecordedReplay(replayMount,{episodeIndex:2,controlsMount:document.querySelector('#recorded-demo .recorded-header-controls')})).catch(error=>{console.error(error);replayMount.textContent='The recording could not load.';}));
