import * as T from './vendor/three.module.min.js';
import {STLLoader} from './vendor/STLLoader.js';
import {loadPiper} from './assets/robot-models/loaders.js';

// A schematic of the preliminary observation, not an additional measured trial.
export async function initDataGap(canvas) {
  const renderer=new T.WebGLRenderer({canvas,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  const scene=new T.Scene();scene.background=new T.Color('#e9e7e1');
  scene.add(new T.HemisphereLight('#ffffff','#a6aaa3',2.4));
  const key=new T.DirectionalLight('#fff6e9',2.4);key.position.set(-1,2,2);scene.add(key);
  const table=new T.Mesh(new T.BoxGeometry(.65,.025,.40),new T.MeshStandardMaterial({color:'#c7b391',roughness:.8}));table.position.y=-.02;scene.add(table);
  const bottle=new T.Group();
  const body=new T.Mesh(new T.CylinderGeometry(.025,.028,.09,32),new T.MeshStandardMaterial({color:'#688945',roughness:.5}));body.position.y=.045;
  const cap=new T.Mesh(new T.CylinderGeometry(.015,.015,.018,24),new T.MeshStandardMaterial({color:'#d8dccc',roughness:.5}));cap.position.y=.098;
  const band=new T.Mesh(new T.CylinderGeometry(.026,.027,.03,32),new T.MeshStandardMaterial({color:'#f5f1dc',roughness:.8}));band.position.y=.047;
  bottle.add(body,cap,band);scene.add(bottle);
  const arm=await loadPiper(T,STLLoader,{color:'#394249',shellColor:'#aeb7bb'});
  const tool=arm.links.link6;tool.removeFromParent();tool.position.set(0,0,0);tool.quaternion.identity();
  const gripper=new T.Group();gripper.rotation.x=Math.PI/2;gripper.add(tool);scene.add(gripper);
  const targetRing=new T.Mesh(new T.RingGeometry(.04,.043,48),new T.MeshBasicMaterial({color:'#59823f',side:T.DoubleSide}));targetRing.rotation.x=-Math.PI/2;targetRing.position.y=-.005;scene.add(targetRing);
  const offset=.125;
  const dashed=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0,.003,.09),new T.Vector3(offset,.003,.09)]),new T.LineDashedMaterial({color:'#b75523',dashSize:.012,gapSize:.008}));dashed.computeLineDistances();scene.add(dashed);
  const crossMaterial=new T.LineBasicMaterial({color:'#b75523'});
  for(const z of [-.025,.025]){
    const cross=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(offset-.025,.003,z),new T.Vector3(offset+.025,.003,-z)]),crossMaterial);scene.add(cross);
  }
  const camera=new T.PerspectiveCamera(34,1,.01,10);
  let active=false,phase=0,lastTime,animation=0;
  function draw(){
    const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
    const distance=.82*Math.max(1,.95/camera.aspect);
    camera.position.set(.43*distance,.48*distance,.76*distance);camera.lookAt(.065,.15,0);
    const descend=T.MathUtils.smoothstep(phase,.06,.36)*(1-T.MathUtils.smoothstep(phase,.75,.98));
    const close=T.MathUtils.smoothstep(phase,.40,.62)*(1-T.MathUtils.smoothstep(phase,.78,.96));
    gripper.position.set(offset,.40-.177*descend,0);
    arm.setJoint('joint7',.035*(1-close));arm.setJoint('joint8',-.035*(1-close));
    renderer.render(scene,camera);
  }
  function tick(now){if(lastTime!==undefined)phase=(phase+(now-lastTime)/5400)%1;lastTime=now;draw();animation=requestAnimationFrame(tick);}
  function setPlaying(value){if(active===value)return;active=value;cancelAnimationFrame(animation);lastTime=undefined;if(active)animation=requestAnimationFrame(tick);else draw();}
  new ResizeObserver(draw).observe(canvas);draw();
  return {setPlaying,draw};
}
