import * as T from './vendor/three.module.min.js';
import {createHumanAvatar} from './human-avatar.mjs';

export async function initDataHuman(canvas) {
  const renderer = new T.WebGLRenderer({canvas, antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  const scene = new T.Scene();
  scene.background = new T.Color('#e8e6e0');
  scene.add(new T.HemisphereLight(0xffffff,0x9c9d94,2));
  const light = new T.DirectionalLight(0xfff5e7,2.2);
  light.position.set(-3,6,4);scene.add(light);
  const floor = new T.GridHelper(8,24,0xa7aaa4,0xc8c9c2);scene.add(floor);
  const wood = new T.MeshStandardMaterial({color:'#a68158',roughness:.65});
  const frame = new T.MeshStandardMaterial({color:'#4d565b',roughness:.55});
  const top = new T.Mesh(new T.BoxGeometry(.8,.05,.46),wood);top.position.set(0,.85,.40);scene.add(top);
  for (const x of [-.35,.35]) for(const z of [.2,.60]) {
    const leg = new T.Mesh(new T.BoxGeometry(.045,.825,.045),frame);leg.position.set(x,.4125,z);scene.add(leg);
  }
  const object = new T.Mesh(new T.BoxGeometry(.065,.065,.065),new T.MeshStandardMaterial({color:'#789552',roughness:.7}));
  const resting = new T.Vector3(-.095,.9075,.345);scene.add(object);
  const avatar = await createHumanAvatar(0);scene.add(avatar.scene);
  const headCamera = new T.Group();
  const cap = new T.Mesh(new T.SphereGeometry(.098,16,8),frame);cap.scale.set(1,.4,1.06);cap.position.y=.13;
  const sensor = new T.Mesh(new T.BoxGeometry(.045,.03,.03),new T.MeshStandardMaterial({color:'#dddeda'}));sensor.position.set(0,.135,.09);
  headCamera.add(cap,sensor);scene.add(headCamera);
  const axes = Array.from({length:3},()=>new T.AxesHelper(.18));scene.add(...axes);
  const camera = new T.PerspectiveCamera(35,1,.03,20);
  let azimuth=.13,distance=2.65,phase=0,active=false,animation=0,lastTime;
  function draw() {
    const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
    const radius=distance*Math.max(1,.8/camera.aspect);
    camera.position.set(Math.sin(azimuth)*radius,1.23,Math.cos(azimuth)*radius);camera.lookAt(0,.94,.13);
    const ease=(a,b)=>T.MathUtils.smoothstep(phase,a,b);
    const reach=ease(.08,.34)*(1-ease(.79,.98));
    const lift=ease(.40,.58)*(1-ease(.66,.80));
    const target=resting.clone();target.y+=lift*.15;
    const pose=avatar.pose({reach,lift,turn:-.19*ease(.02,.23),object:target});
    headCamera.position.copy(pose.headPosition);headCamera.quaternion.copy(pose.headRotation);
    axes[0].position.copy(pose.headPosition);axes[0].quaternion.copy(pose.headRotation);
    pose.hands.forEach((hand,index)=>{axes[index+1].position.copy(hand.position);axes[index+1].quaternion.copy(hand.rotation);});
    const grasp=ease(.32,.40)*(1-ease(.75,.83));
    object.position.copy(resting).lerp(pose.hands[0].position,grasp);
    object.quaternion.copy(pose.hands[0].rotation).slerp(new T.Quaternion(),1-grasp);
    renderer.render(scene,camera);
  }
  function tick(now) {
    if(lastTime!==undefined)phase=(phase+(now-lastTime)/8500)%1;
    lastTime=now;draw();animation=requestAnimationFrame(tick);
  }
  function setPlaying(value) {
    if(active===value)return;active=value;
    cancelAnimationFrame(animation);lastTime=undefined;
    if(active)animation=requestAnimationFrame(tick);
    else draw();
  }
  let drag;
  canvas.addEventListener('pointerdown',e=>{drag=e.clientX;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(drag===undefined)return;azimuth-=(e.clientX-drag)*.008;drag=e.clientX;draw();});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{drag=undefined;});
  canvas.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();distance=T.MathUtils.clamp(distance+e.deltaY*.002,1.8,4);draw();},{passive:false});
  new ResizeObserver(draw).observe(canvas);draw();
  return {setPlaying,draw};
}
