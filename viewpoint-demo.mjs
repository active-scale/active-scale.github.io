import * as T from './vendor/three.module.min.js';
import {createAmp, defaults} from './assets/robot-models/amp.mjs?v=20261104slots1';

const degrees = Math.PI / 180;
const vector = (...values) => new T.Vector3(...values);
const finish = (color, roughness = .64, metalness = .05) => new T.MeshStandardMaterial({color, roughness, metalness});
function box(width, height, depth, material, x, y, z, name = '') {
  const mesh = new T.Mesh(new T.BoxGeometry(width,height,depth),material);
  mesh.position.set(x,y,z);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;return mesh;
}
function cylinder(radius,height,material,x,y,z) {
  const mesh=new T.Mesh(new T.CylinderGeometry(radius,radius,height,32),material);
  mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;return mesh;
}
function bottle(color = 0x567d86) {
  const group=new T.Group();group.name='Bottle';
  const profile=[[0,0],[.029,0],[.035,.009],[.035,.155],[.032,.17],[.016,.185],[.016,.219],[0,.219]].map(p=>new T.Vector2(...p));
  const body=new T.Mesh(new T.LatheGeometry(profile,32),finish(color,.3,.12));
  group.add(body,cylinder(.018,.018,finish(0x31464b),0,.222,0),cylinder(.0353,.066,finish(0xe9dfc4),0,.103,0));
  // Sample actual bottle surfaces, including the cap, rather than an enclosing box.
  group.userData.samples=[];
  for(const [radius,height] of [[.035,.018],[.035,.08],[.035,.15],[.022,.18],[.018,.224]])for(let i=0;i<12;i++){
    const a=i*Math.PI/6;group.userData.samples.push({point:vector(Math.cos(a)*radius,height,Math.sin(a)*radius),normal:vector(Math.cos(a),0,Math.sin(a))});
  }
  group.userData.samples.push({point:vector(0,.231,0),normal:vector(0,1,0)});
  return group;
}
function mug(color = 0x447b9c) {
  const group=new T.Group();group.name='Mug';
  const profile=[[0,0],[.038,0],[.044,.009],[.045,.108],[.041,.111],[.037,.105],[.037,.015],[0,.015]].map(p=>new T.Vector2(...p));
  const ceramic=finish(color,.29,.04);
  group.add(new T.Mesh(new T.LatheGeometry(profile,36),ceramic));
  const handle=new T.Mesh(new T.TorusGeometry(.029,.009,12,28),ceramic);handle.position.set(.047,.061,0);handle.scale.set(.8,1.15,1);group.add(handle);
  group.userData.samples=[];
  for(const h of [.02,.055,.095])for(let i=0;i<12;i++){
    const a=i*Math.PI/6;group.userData.samples.push({point:vector(Math.cos(a)*.044,h,Math.sin(a)*.044),normal:vector(Math.cos(a),0,Math.sin(a))});
  }
  for(let a=0;a<12;a++)for(let b=0;b<4;b++){
    const angle=a*Math.PI/6,tube=b*Math.PI/2,r=.029+.009*Math.cos(tube);
    group.userData.samples.push({point:vector(.047+.8*r*Math.cos(angle),.061+1.15*r*Math.sin(angle),.009*Math.sin(tube)),normal:vector(Math.cos(angle)*Math.cos(tube)/.8,Math.sin(angle)*Math.cos(tube)/1.15,Math.sin(tube)).normalize()});
  }
  return group;
}
function environment() {
  const scene=new T.Scene();scene.background=new T.Color(0xedece7);scene.fog=new T.Fog(0xedece7,6,15);
  scene.add(new T.HemisphereLight(0xfffdf4,0xa4a69b,2));
  const key=new T.DirectionalLight(0xfff4df,2.1);key.position.set(-3,6,3);scene.add(key);
  const floor=new T.Mesh(new T.PlaneGeometry(30,30),finish(0xdeddd5));floor.rotation.x=-Math.PI/2;floor.position.y=-.018;scene.add(floor);
  const grid=new T.GridHelper(16,32,0xc8c9c0,0xd2d2c9);grid.position.y=-.012;scene.add(grid);
  return scene;
}
function worktable(scene, kind, solids) {
  const center=kind==='search'?.42:0,width=kind==='search'?1.95:1.25,depth=1.16,z=-1.16;
  const wood=finish(0xb19571),metal=finish(0x566366,.55,.24);
  const add=(mesh)=>{scene.add(mesh);solids.push(mesh);return mesh;};
  add(box(width,.045,depth,wood,center,.86,z,'Worktable top'));
  for(const x of [center-width/2+.065,center+width/2-.065])for(const pz of [z-depth/2+.065,z+depth/2-.065])add(box(.045,.8375,.045,metal,x,.41875,pz,'Worktable leg'));
}
function storageBin(scene, solids) {
  const material=finish(0x8d9e9c),rim=finish(0x667a78),inside=finish(0xa6b1a9);
  const width=.62,depth=.72,height=.43,base=.885,z=-1.20,wall=.018;
  const add=mesh=>{scene.add(mesh);solids.push(mesh);return mesh;};
  add(box(width,.018,depth,inside,0,base+.009,z,'Bin floor'));
  for(const side of [-1,1]){
    add(box(wall,height,depth,material,side*(width-wall)/2,base+height/2,z,'Bin side'));
    add(box(width,height,wall,material,0,base+height/2,z+side*(depth-wall)/2,'Bin end'));
    add(box(width+.012,.022,.028,rim,0,base+height+.008,z+side*depth/2,'Bin rim'));
    add(box(.028,.022,depth,rim,side*width/2,base+height+.008,z,'Bin rim'));
  }
  // A recessed grip and raised ribs give the opaque front panel a recognizable scale.
  add(box(.19,.032,.006,rim,0,base+height-.064,z+depth/2+.012,'Bin grip'));
  for(const x of [-.20,-.10,.10,.20])add(box(.008,.27,.007,inside,x,base+.20,z+depth/2+.011,'Bin rib'));
  const target=bottle();target.position.set(.015,base+.019,-1.40);scene.add(target);
  return target;
}
function shelf(scene,solids) {
  const frame=finish(0xc9ccbf),wood=finish(0xd5c4a5),back=finish(0xb4beb3);
  const x=.77,z=-1.26,width=1.05,depth=.30,bottom=.884;
  const add=mesh=>{scene.add(mesh);solids.push(mesh);return mesh;};
  add(box(width,.73,.018,back,x,bottom+.365,z-depth/2,'Shelf back'));
  for(const side of [-1,1])add(box(.026,.76,depth,frame,x+side*width/2,bottom+.38,z,'Shelf side'));
  for(const y of [bottom+.012,bottom+.294,bottom+.59])add(box(width,.024,depth,wood,x,y,z,'Shelf board'));
  const items=[
    [bottle(0xb27c4d),.39,bottom+.024,-1.22],
    [mug(0xe5ded0),.74,bottom+.024,-1.22],
    [bottle(0x82976f),1.09,bottom+.024,-1.22],
    [mug(0xb38b67),.43,bottom+.306,-1.18],
    [bottle(0xdfd3ac),.72,bottom+.306,-1.22],
    [mug(),1.08,bottom+.306,-1.16],
  ];
  for(const [item,ix,iy,iz] of items){item.position.set(ix,iy,iz);scene.add(item);}
  const target=items.at(-1)[0];target.name='Blue mug';
  for(const [item]of items)if(item!==target)item.traverse(o=>{if(o.isMesh)solids.push(o);});
  return target;
}
function solveGoal(rig, calibration, kind, target) {
  const center={...calibration.joints.center,...(kind==='occlusion'?{joint1:0,joint2:95,joint3:-115,joint4:0,joint5:60}:{joint1:-50,joint4:0})};
  const goal={...calibration,joints:{...calibration.joints,center}};
  rig.pose(goal);
  const arm=rig.arms.center;
  for(let pass=0;pass<24;pass++)for(const id of kind==='occlusion'?['joint5']:['joint5','joint1']){
    const joint=arm.joints[id];
    const axis=joint.axis.clone().applyQuaternion(joint.frame.getWorldQuaternion(new T.Quaternion()));
    const origin=arm.optical.getWorldPosition(vector());
    const forward=arm.optical.getWorldDirection(vector()).projectOnPlane(axis).normalize();
    const desired=target.clone().sub(origin).projectOnPlane(axis).normalize();
    const delta=Math.atan2(axis.dot(forward.clone().cross(desired)),forward.dot(desired));
    const angle=T.MathUtils.clamp((center[id]??0)*degrees+delta,...joint.range);
    center[id]=angle/degrees;arm.setJoint(id,angle);rig.root.updateMatrixWorld(true);
  }
  rig.pose(calibration);return goal;
}
export function targetVisibility(target,eye,obstacles) {
  const ray=new T.Raycaster(),origin=eye.getWorldPosition(vector());
  let tested=0,framed=0,visible=0;
  for(const sample of target.userData.samples){
    const point=sample.point.clone().applyMatrix4(target.matrixWorld);
    const normal=sample.normal.clone().transformDirection(target.matrixWorld);
    if(normal.dot(origin.clone().sub(point))<=0)continue;
    tested++;
    const clip=point.clone().project(eye);
    if(Math.abs(clip.x)>1||Math.abs(clip.y)>1||clip.z< -1||clip.z>1)continue;
    framed++;
    const direction=point.clone().sub(origin);ray.set(origin,direction.clone().normalize());ray.near=.006;ray.far=direction.length()-.001;
    if(!ray.intersectObjects(obstacles,false).length)visible++;
  }
  const state=visible===tested&&tested?'visible':visible?'partial':framed?'occluded':'outside';
  return {state,tested,framed,visible,ratio:tested?visible/tested:0};
}
// The renderer and the numerical audit use exactly this scene and joint trajectory.
export async function buildViewpointCase(kind,calibration=structuredClone(defaults)) {
  const scene=environment(),solids=[];worktable(scene,kind,solids);
  const target=kind==='occlusion'?storageBin(scene,solids):shelf(scene,solids);
  const rig=await createAmp();rig.root.rotation.y=Math.PI/2;scene.add(rig.root);rig.pose(calibration);
  const aim=target.position.clone().add(vector(0,kind==='occlusion'?.115:.06,0));
  let goal=solveGoal(rig,calibration,kind,aim),start=structuredClone(calibration.joints.center);
  let current={...calibration,joints:{...calibration.joints,center:{...start}}};
  const eye=new T.PerspectiveCamera(52.4,4/3,.025,15),optical=rig.arms.center.optical;
  const obstacles=[...solids];rig.root.traverse(o=>{if(o.isMesh)obstacles.push(o);});
  for(const helper of rig.frusta()){helper.layers.set(1);helper.visible=helper===rig.arms.center.frustum;scene.add(helper);}
  function pose(progress){
    const p=T.MathUtils.clamp(progress,0,1),smooth=p*p*p*(p*(p*6-15)+10);
    for(const id of Object.keys(goal.joints.center))current.joints.center[id]=T.MathUtils.lerp(start[id]??0,goal.joints.center[id],smooth);
    rig.pose(current);optical.getWorldPosition(eye.position);optical.getWorldQuaternion(eye.quaternion);
    eye.updateProjectionMatrix();eye.updateMatrixWorld(true);scene.updateMatrixWorld(true);
    return targetVisibility(target,eye,obstacles);
  }
  function calibrate(next){calibration=next;start=structuredClone(next.joints.center);goal=solveGoal(rig,next,kind,aim);current={...next,joints:{...next.joints,center:{...start}}};pose(0);}
  pose(0);return {scene,rig,eye,target,solids,obstacles,pose,calibrate,get goal(){return goal;}};
}
async function createView(card,kind,calibration) {
  const canvas=card.querySelector('canvas'),renderer=new T.WebGLRenderer({canvas,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0xedece7);
  const model=await buildViewpointCase(kind,calibration),{scene,eye}=model;
  const observer=new T.PerspectiveCamera(38,1,.05,30);observer.layers.enable(1);
  const status=card.querySelector('output'),insetLabel=card.querySelector('.vp-inset-label');
  const focus=kind==='occlusion'?vector(-.02,.84,-.73):vector(.38,.87,-.72);
  function draw(progress,orbit){
    const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;
    renderer.setSize(width,height,false);observer.aspect=width/height;observer.updateProjectionMatrix();
    const radius=3.4*Math.max(1,.99/observer.aspect),angle=.69+orbit;
    observer.position.set(focus.x+radius*Math.sin(angle),focus.y+radius*.54,focus.z+radius*Math.cos(angle));observer.lookAt(focus);
    const visibility=model.pose(progress),name=kind==='occlusion'?'Bottle':'Blue mug';
    const labels={visible:`${name} in view`,partial:`${name} partly visible`,occluded:`${name} occluded`,outside:`${name} outside the view`};
    status.textContent=labels[visibility.state];status.dataset.state=visibility.state;
    renderer.setScissorTest(false);renderer.setViewport(0,0,width,height);renderer.render(scene,observer);
    const insetWidth=Math.round(width*.40),insetHeight=Math.round(insetWidth/eye.aspect);
    insetLabel.style.bottom=insetHeight+13+'px';
    renderer.setScissorTest(true);renderer.setScissor(width-insetWidth-10,10,insetWidth,insetHeight);renderer.setViewport(width-insetWidth-10,10,insetWidth,insetHeight);renderer.render(scene,eye);renderer.setScissorTest(false);
  }
  return {draw,canvas,calibrate:model.calibrate};
}
export function initViewpointDemo(){
  const mount=document.getElementById('viewpoint-demo');if(!mount)return;
  const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./viewpoint-demo.css?v=20261104refine3',import.meta.url).href;document.head.append(link);
  mount.innerHTML=`<div class="vp-pair">
    <article class="vp-case"><div class="vp-case-title"><h4>Occlusion-Driven Manipulation</h4><p>Look over the bin to find the bottle inside.</p></div><div class="vp-viewport"><canvas aria-label="AMP moves its camera to reveal a bottle inside an opaque storage bin"></canvas><output aria-live="polite"></output><span class="vp-inset-label">Live head camera</span></div></article>
    <article class="vp-case"><div class="vp-case-title"><h4>Active Search and Localization</h4><p>Search the shelf for the blue mug.</p></div><div class="vp-viewport"><canvas aria-label="AMP turns its camera to find a blue mug among shelf objects"></canvas><output aria-live="polite"></output><span class="vp-inset-label">Live head camera</span></div></article>
    </div><div class="vp-controls"><button type="button" disabled>Loading models…</button><label for="viewpoint-progress">Shared timeline</label><input id="viewpoint-progress" type="range" min="0" max="1000" value="0" aria-label="Shared viewpoint motion timeline"><span class="vp-time">Initial pose</span></div><p class="vp-note">Drag either scene to orbit. Illustrative camera motions start from AMP’s calibrated initial pose.</p>`;
  const button=mount.querySelector('button'),timeline=mount.querySelector('input'),time=mount.querySelector('.vp-time');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let views=[],progress=0,frame=0,lastTime,orbit=0,visible=false,initialized=false,autoplay=true;
  function draw(){views.forEach(view=>view.draw(progress,orbit));timeline.value=Math.round(progress*1000);time.textContent=progress===0?'Initial pose':progress===1?'Target view':Math.round(progress*100)+'%';}
  function stop(){cancelAnimationFrame(frame);frame=0;lastTime=undefined;button.textContent=progress===1?'Replay both':'Play both';}
  function tick(now){if(lastTime!==undefined)progress=Math.min(1,progress+(now-lastTime)/8000);lastTime=now;draw();if(progress===1)stop();else frame=requestAnimationFrame(tick);}
  function play(){if(!views.length||frame)return;if(progress===1)progress=0;lastTime=undefined;button.textContent='Pause both';frame=requestAnimationFrame(tick);}
  button.addEventListener('click',()=>{autoplay=false;if(frame)stop();else play();});
  timeline.addEventListener('input',()=>{autoplay=false;progress=Number(timeline.value)/1000;stop();draw();});
  async function initialize(){
    initialized=true;
    try{
      const calibration=structuredClone(defaults);
      views=await Promise.all([...mount.querySelectorAll('.vp-case')].map((card,index)=>createView(card,index?'search':'occlusion',calibration)));
      button.disabled=false;stop();draw();
      for(const view of views){
        let drag;
        view.canvas.addEventListener('pointerdown',event=>{drag=event.clientX;view.canvas.setPointerCapture(event.pointerId);view.canvas.style.cursor='grabbing';});
        view.canvas.addEventListener('pointermove',event=>{if(drag===undefined)return;orbit+=(event.clientX-drag)*.007;drag=event.clientX;draw();});
        for(const event of ['pointerup','pointercancel','lostpointercapture'])view.canvas.addEventListener(event,()=>{drag=undefined;view.canvas.style.cursor='grab';});
        new ResizeObserver(draw).observe(view.canvas);
      }
      if(visible&&autoplay&&!reduced.matches)play();
    }catch(error){button.textContent='3D preview unavailable';mount.querySelector('.vp-note').textContent='The hardware video above shows the physical system.';console.error(error);}
  }
  document.addEventListener('amp-calibration',()=>{if(!views.length)return;stop();progress=0;views.forEach(view=>view.calibrate(structuredClone(defaults)));draw();});
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible&&!initialized)initialize();else if(!visible&&frame)stop();else if(visible&&autoplay&&views.length&&progress<1&&!reduced.matches)play();},{threshold:.2});observer.observe(mount);
}
