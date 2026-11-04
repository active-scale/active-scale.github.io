import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const folder=path.dirname(fileURLToPath(import.meta.url));
const site=path.resolve(folder,'..');
globalThis.fetch=async request=>new Response(await fs.readFile(new URL(request.url??request)));
globalThis.ProgressEvent=Event;
const T=await import(new URL('../vendor/three.module.min.js',import.meta.url));
const {createAmp,defaults}=await import(new URL('../assets/robot-models/amp.mjs',import.meta.url));
const {recordedJoints}=await import(new URL('../recorded-motion.mjs',import.meta.url));
const episode=JSON.parse(await fs.readFile(path.join(site,'assets/replay/pot-episode-38.json')));
const rig=await createAmp();
const sourceQposHash=createHash('sha256').update(JSON.stringify(episode.qpos)).digest('hex');
const {createReplayScene}=await import(new URL('../replay-scene.mjs',import.meta.url));
const scene=new T.Scene();scene.add(rig.root);
const placement=createReplayScene(scene);
rig.pose(recordedJoints(episode,0,defaults));placement.update(0,episode,rig);scene.updateMatrixWorld(true);
const sceneRoot=scene.getObjectByName('Recorded Pot scene');
const actualTable=scene.getObjectByName('Table');
if(!actualTable)throw new Error('No named Table in the replay scene');
const actualParts=actualTable.children.filter(object=>object.isMesh).map((mesh,index)=>({name:mesh.name||(index?'leg-'+index:'top'),box:new T.Box3().setFromObject(mesh)}));
const actualTop=actualParts[0].box;
const supports=Object.fromEntries(['Pot','Lid'].map(name=>{
 const bounds=new T.Box3().setFromObject(sceneRoot.getObjectByName(name));
 return [name,{min:bounds.min.toArray(),max:bounds.max.toArray(),supportedXZ:bounds.min.x>=actualTop.min.x&&bounds.max.x<=actualTop.max.x&&bounds.min.z>=actualTop.min.z&&bounds.max.z<=actualTop.max.z}];
}));
const worldTriangle=new T.Triangle();
function makeBVH(geometry){
 const position=geometry.attributes.position,index=geometry.index;
 const count=index?index.count:position.count,faces=[];
 for(let i=0;i<count;i+=3){
  const points=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(position,index?index.getX(i+j):i+j));
  const bounds=new T.Box3().setFromPoints(points);
  faces.push({points,bounds,center:bounds.getCenter(new T.Vector3())});
 }
 function node(faces){
  const bounds=new T.Box3();faces.forEach(face=>bounds.union(face.bounds));
  if(faces.length<=24)return {bounds,faces};
  const size=bounds.getSize(new T.Vector3()),axis=size.x>=size.y&&size.x>=size.z?'x':size.y>=size.z?'y':'z';
  faces.sort((a,b)=>a.center[axis]-b.center[axis]);const half=faces.length>>1;
  return {bounds,left:node(faces.slice(0,half)),right:node(faces.slice(half))};
 }
 return node(faces);
}
const bvhs=new Map(),meshes=[];
for(const [name,arm] of Object.entries(rig.arms))arm.root.traverse(object=>{if(object.isMesh)object.userData.arm=name;});
rig.root.traverse(mesh=>{
 if(!mesh.isMesh)return;
 if(!bvhs.has(mesh.geometry))bvhs.set(mesh.geometry,makeBVH(mesh.geometry));
 let link=mesh.parent;while(link&&!link.name)link=link.parent;
 meshes.push({mesh,name:(mesh.userData.arm??'static')+'/'+(mesh.name||link?.name||'mount'),bvh:bvhs.get(mesh.geometry)});
});
console.log('Geometry ready',meshes.length,'meshes,',bvhs.size,'distinct BVHs');
const inverse=new T.Matrix4(),localQuery=new T.Box3(),meshBounds=new T.Box3();
function intersects(entry,box){
 const {mesh,bvh}=entry;
 meshBounds.copy(bvh.bounds).applyMatrix4(mesh.matrixWorld);
 if(!meshBounds.intersectsBox(box))return false;
 inverse.copy(mesh.matrixWorld).invert();localQuery.copy(box).applyMatrix4(inverse);
 function visit(node){
  if(!node.bounds.intersectsBox(localQuery))return false;
  if(!node.faces)return visit(node.left)||visit(node.right);
  for(const face of node.faces){
   if(!face.bounds.intersectsBox(localQuery))continue;
   const [a,b,c]=face.points;
   worldTriangle.set(a,b,c);worldTriangle.a.applyMatrix4(mesh.matrixWorld);worldTriangle.b.applyMatrix4(mesh.matrixWorld);worldTriangle.c.applyMatrix4(mesh.matrixWorld);
   if(box.intersectsTriangle(worldTriangle))return true;
  }
  return false;
 }
 return visit(bvh);
}
const candidates=[{name:'actual-scene',parts:actualParts}];
const summaries=[];
for(const candidate of candidates){
 const parts=candidate.parts;
 const clearances=[0,.02];
 const sampleScale=2;
 const sampleCount=(episode.frameCount-1)*sampleScale+1;
 const cases=clearances.map(clearance=>({clearance,parts:parts.map(p=>({...p,box:p.box.clone().expandByScalar(clearance)})),hits:new Map()}));
 for(let frame=0;frame<sampleCount;frame++){
  rig.pose(recordedJoints(episode,frame/(episode.fps*sampleScale),defaults));
  for(const entry of meshes)for(const test of cases)for(const part of test.parts){
   if(intersects(entry,part.box)){
    const key=entry.name+' @ '+part.name;
    if(!test.hits.has(key))test.hits.set(key,[]);
    test.hits.get(key).push(frame);
   }
  }
 }
 const {parts:unusedParts,...dimensions}=candidate;
 const result={...dimensions,samples:sampleCount,parts:parts.map(part=>({name:part.name,min:part.box.min.toArray(),max:part.box.max.toArray()})),cases:cases.map(test=>({clearance:test.clearance,hits:[...test.hits].map(([name,frames])=>{
  const intervals=[];for(const frame of frames){const last=intervals.at(-1);if(last&&frame===last[1]+1)last[1]=frame;else intervals.push([frame,frame]);}
  return {name,frames:frames.length,seconds:intervals.map(pair=>pair.map(frame=>+(frame/(episode.fps*sampleScale)).toFixed(3)))};
 })}))};
 summaries.push(result);console.log(JSON.stringify(result));
}
const finalQposHash=createHash('sha256').update(JSON.stringify(episode.qpos)).digest('hex');
if(sourceQposHash!==finalQposHash)throw new Error('Recorded qpos changed during audit');
const report={source:'assets/replay/pot-episode-38.json',recordedFrames:episode.frameCount,fps:episode.fps,qposSha256:sourceQposHash,robotMeshes:meshes.length,distinctGeometryBVHs:bvhs.size,method:'World-space triangle versus table AABB separating-axis test, local geometry BVH broad phase. Table boxes also inflated by 20mm along all axes for clearance. Every source frame plus interpolated half-frame. Robot frustum lines are excluded.',actualSceneSupports:supports,results:summaries};
await fs.writeFile(path.join(folder,'last-pot-table-collision.json'),JSON.stringify(report,null,2));
if(Object.values(supports).some(object=>!object.supportedXZ))throw new Error('An initial object overhangs the tabletop');
if(summaries.some(result=>result.cases.some(test=>test.hits.length)))throw new Error('Robot/table collision detected; see checks/last-pot-table-collision.json');
console.log('PASS: all 1681 poses, all robot meshes, tabletop and four legs, including 20mm clearance expansion. Recorded qpos unchanged.');
