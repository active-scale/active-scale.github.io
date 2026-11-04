import * as T from './vendor/three.module.min.js';
import {createHumanAvatar} from './human-avatar.mjs?v=20261104refine3';

function label(text, color = '#334b52', width = .30) {
  const image = document.createElement('canvas');
  image.width = 320;image.height = 72;
  const context = image.getContext('2d');
  context.fillStyle = 'rgba(255,255,252,.94)';
  context.beginPath();context.roundRect(1,1,318,70,14);context.fill();
  context.fillStyle = color;context.font = '600 28px system-ui';context.textAlign = 'center';context.textBaseline = 'middle';
  context.fillText(text,160,36);
  const sprite = new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(image),depthTest:false,transparent:true}));
  sprite.scale.set(width,width*72/320,1);sprite.renderOrder=4;
  return sprite;
}

function trackedFrame(name) {
  const root = new T.Group();
  const axes = new T.AxesHelper(.13);
  axes.material.depthTest = false;axes.renderOrder = 3;
  root.add(axes);
  for(const [letter,color,position] of [
    ['x','#cf4a45',[.15,0,0]],['y','#258248',[0,.15,0]],['z','#3665c1',[0,0,.15]]
  ]) {
    const marker=label(letter,color,.038);
    marker.position.fromArray(position);root.add(marker);
  }
  const title=label(name,'#334b52',name==='Head pose'?.25:.30);
  return {root,title};
}

export async function initDataHuman(canvas) {
  const renderer = new T.WebGLRenderer({canvas,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  const scene = new T.Scene();
  scene.background = new T.Color('#e8e7e1');
  scene.add(new T.HemisphereLight(0xffffff,0x999c95,2));
  const light = new T.DirectionalLight(0xfff8eb,2.3);
  light.position.set(-3,6,4);scene.add(light);
  const floor = new T.GridHelper(8,24,0xb5b7af,0xd1d2ca);floor.position.y=-.01;scene.add(floor);
  const wood = new T.MeshStandardMaterial({color:'#c6ae8b',roughness:.72});
  const dark = new T.MeshStandardMaterial({color:'#38484d',roughness:.62});
  const top = new T.Mesh(new T.BoxGeometry(.90,.045,.50),wood);top.position.set(0,.85,.42);scene.add(top);
  for(const x of [-.39,.39])for(const z of [.22,.62]){
    const leg = new T.Mesh(new T.BoxGeometry(.035,.825,.035),dark);leg.position.set(x,.4125,z);scene.add(leg);
  }

  const mug = new T.Group();
  const ceramic = new T.MeshStandardMaterial({color:'#d0d9c6',roughness:.28});
  const profile = [
    new T.Vector2(0,0),new T.Vector2(.033,0),new T.Vector2(.039,.008),
    new T.Vector2(.040,.084),new T.Vector2(.035,.084),new T.Vector2(.033,.012),
    new T.Vector2(0,.012)
  ];
  mug.add(new T.Mesh(new T.LatheGeometry(profile,32),ceramic));
  const handle = new T.Mesh(new T.TorusGeometry(.024,.007,10,24),ceramic);
  handle.position.set(-.043,.045,0);handle.rotation.y=Math.PI/2;mug.add(handle);
  const coffee = new T.Mesh(new T.CircleGeometry(.032,32),new T.MeshStandardMaterial({color:'#514136',roughness:.35}));
  coffee.rotation.x=-Math.PI/2;coffee.position.y=.065;mug.add(coffee);
  const target = new T.Vector3(-.09,.880,.39);mug.position.copy(target);scene.add(mug);
  const saucer = new T.Mesh(new T.CylinderGeometry(.062,.056,.008,40),ceramic);
  saucer.position.set(target.x,.876,target.z);scene.add(saucer);
  const book = new T.Mesh(new T.BoxGeometry(.16,.014,.12),new T.MeshStandardMaterial({color:'#b58366',roughness:.8}));
  book.position.set(.23,.88,.47);book.rotation.y=.12;scene.add(book);

  const avatar = await createHumanAvatar(0);scene.add(avatar.scene);
  const headBone=avatar.scene.getObjectByName('head');
  const capture = new T.Group();
  const bandVertices = [];
  const bandIndices = [];
  const segments = 64;
  for (let index = 0; index <= segments; index++) {
    const angle = index / segments * Math.PI * 2;
    const front = (Math.cos(angle) + 1) / 2;
    for (const [radial, vertical] of [[0,-1],[0,1],[1,-1],[1,1]]) {
      const width = .081 + radial * .004;
      const depth = .092 + radial * .004;
      bandVertices.push(Math.sin(angle) * width,.073 + front * .018 + vertical * .006,Math.cos(angle) * depth - .008);
    }
    if (index === segments) continue;
    const first = index * 4, next = first + 4;
    for (const [a,b] of [[0,1],[2,0],[1,3],[3,2]]) {
      bandIndices.push(first+a,next+a,first+b,first+b,next+a,next+b);
    }
  }
  const bandGeometry = new T.BufferGeometry();
  bandGeometry.setAttribute('position',new T.Float32BufferAttribute(bandVertices,3));
  bandGeometry.setIndex(bandIndices);bandGeometry.computeVertexNormals();
  const headband = new T.Mesh(bandGeometry,dark);
  const sensor = new T.Mesh(new T.BoxGeometry(.047,.028,.027),new T.MeshStandardMaterial({color:'#e5e7e0',roughness:.42}));
  sensor.position.set(0,.091,.098);
  const lens = new T.Mesh(new T.CylinderGeometry(.008,.008,.006,24),new T.MeshStandardMaterial({color:'#182c3e',metalness:.35,roughness:.18}));
  lens.rotation.x=Math.PI/2;lens.position.set(0,.091,.1145);
  capture.add(headband,sensor,lens);scene.add(capture);
  const optical = new T.PerspectiveCamera(54,4/3,.018,.20);
  optical.position.copy(lens.position);optical.rotation.y=Math.PI;capture.add(optical);
  const frustum = new T.CameraHelper(optical),orange=new T.Color('#d16a1a');
  frustum.setColors(orange,orange,orange,orange,orange);scene.add(frustum);
  const frames = [trackedFrame('Head pose'),trackedFrame('Right wrist'),trackedFrame('Left wrist')];
  for(const frame of frames)scene.add(frame.root,frame.title);

  const palmRest=[new T.Vector3(-.24,1.015,.19),new T.Vector3(.24,1.015,.21)];
  const contact=new T.Vector3(-.195,.951,.329);
  function poseAt(progress){
    const ease=(a,b)=>T.MathUtils.smoothstep(progress,a,b);
    const reach=ease(.14,.44)*(1-ease(.70,.96));
    const focus=ease(.02,.29)*(1-ease(.80,1));
    const hands=[palmRest[0].clone().lerp(contact,reach),palmRest[1].clone()];
    const pose=avatar.pose({reach,lift:0,turn:-.20*focus,object:target,handTargets:hands});
    // The demonstration follows the tabletop while the hand reaches for the cup.
    headBone.rotateX(.55+.18*focus);
    capture.position.copy(headBone.getWorldPosition(new T.Vector3()));
    capture.quaternion.copy(headBone.getWorldQuaternion(new T.Quaternion()));
    capture.updateMatrixWorld(true);
    return {positions:[optical.getWorldPosition(new T.Vector3()),...pose.hands.map(hand=>hand.position.clone())],
      rotations:[capture.quaternion.clone(),...pose.hands.map(hand=>hand.rotation.clone())]};
  }

  const samples=Array.from({length:81},(_,index)=>poseAt(index/80).positions);
  const trails=['#d16a1a','#317b9c','#4a9673'].map((color,index)=>{
    const geometry=new T.BufferGeometry().setFromPoints(samples.map(row=>row[index]));
    const backdrop=new T.Line(geometry,new T.LineDashedMaterial({color,transparent:true,opacity:.25,dashSize:.012,gapSize:.009}));
    backdrop.computeLineDistances();scene.add(backdrop);
    const trace=new T.Line(geometry.clone(),new T.LineBasicMaterial({color,transparent:true,opacity:.9,depthTest:false}));
    trace.renderOrder=2;scene.add(trace);return trace;
  });
  const camera = new T.PerspectiveCamera(35,1,.03,20);
  let azimuth=.28,distance=1.95,phase=.08,active=false,animation=0,lastTime;
  function draw(){
    const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
    const radius=distance*Math.max(1,.82/camera.aspect);
    camera.position.set(Math.sin(azimuth)*radius,1.43,Math.cos(azimuth)*radius+.10);
    camera.lookAt(0,1.27,.16);
    const pose=poseAt(phase);
    frames.forEach((frame,index)=>{
      frame.root.position.copy(pose.positions[index]);frame.root.quaternion.copy(pose.rotations[index]);
      frame.title.position.copy(pose.positions[index]).add(new T.Vector3(index===0?.25:index===1?-.17:.18,index===0?.04:.12,.015));
      trails[index].geometry.setDrawRange(0,Math.max(2,Math.ceil(phase*80)+1));
    });
    frustum.update();renderer.render(scene,camera);
  }
  function tick(now){
    if(lastTime!==undefined)phase=(phase+(now-lastTime)/10000)%1;
    lastTime=now;draw();animation=requestAnimationFrame(tick);
  }
  function setPlaying(value){
    if(active===value)return;active=value;
    cancelAnimationFrame(animation);lastTime=undefined;
    if(active)animation=requestAnimationFrame(tick);else draw();
  }
  let drag;
  canvas.addEventListener('pointerdown',event=>{drag=event.clientX;canvas.setPointerCapture(event.pointerId);});
  canvas.addEventListener('pointermove',event=>{
    if(drag===undefined)return;azimuth-=(event.clientX-drag)*.008;drag=event.clientX;draw();
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{drag=undefined;});
  canvas.addEventListener('wheel',event=>{
    if(!event.ctrlKey)return;event.preventDefault();
    distance=T.MathUtils.clamp(distance+event.deltaY*.002,1.65,3.2);draw();
  },{passive:false});
  new ResizeObserver(draw).observe(canvas);draw();
  return {setPlaying,draw};
}
