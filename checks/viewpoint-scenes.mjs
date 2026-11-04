// Run from any directory: node active-scale-site/checks/viewpoint-scenes.mjs
// Uses the production scene, actual manufacturer meshes, real optics and playback trajectory.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
globalThis.fetch=async request=>new Response(await fs.readFile(new URL(request.url??request)));
globalThis.ProgressEvent=Event;
const T=await import('../vendor/three.module.min.js');
const {buildViewpointCase}=await import('../viewpoint-demo.mjs');
const bvhCache=new Map(),triangle=new T.Triangle();
function makeBVH(geometry){
  const positions=geometry.attributes.position,index=geometry.index,faces=[];
  for(let i=0;i<(index?index.count:positions.count);i+=3){
    const points=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(positions,index?index.getX(i+j):i+j));
    const bounds=new T.Box3().setFromPoints(points);faces.push({points,bounds,center:bounds.getCenter(new T.Vector3())});
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
function meshIntersectsBox(mesh,bvh,worldBox){
  if(!bvh.bounds.clone().applyMatrix4(mesh.matrixWorld).intersectsBox(worldBox))return false;
  const localBox=worldBox.clone().applyMatrix4(mesh.matrixWorld.clone().invert());
  function visit(node){
    if(!node.bounds.intersectsBox(localBox))return false;
    if(!node.faces)return visit(node.left)||visit(node.right);
    for(const face of node.faces){
      if(!face.bounds.intersectsBox(localBox))continue;
      triangle.set(...face.points);
      for(const point of [triangle.a,triangle.b,triangle.c])point.applyMatrix4(mesh.matrixWorld);
      if(worldBox.intersectsTriangle(triangle))return true;
    }
    return false;
  }
  return visit(bvh);
}
const report=[];
for(const kind of ['occlusion','search']){
  const model=await buildViewpointCase(kind),meshes=[];
  model.rig.root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    if(!bvhCache.has(mesh.geometry))bvhCache.set(mesh.geometry,makeBVH(mesh.geometry));
    meshes.push(mesh);
  });
  const initial=model.pose(0),end=model.pose(1);
  assert.equal(initial.state,kind==='occlusion'?'occluded':'outside',`${kind}: initial optical condition`);
  assert.equal(initial.visible,0,`${kind}: no visible initial target samples`);
  if(kind==='occlusion')assert.equal(initial.framed,initial.tested,'Occlusion must come from geometry, not a target outside the camera');
  if(kind==='search')assert.equal(initial.framed,0,'Search target must initially lie outside the optical frustum');
  assert.equal(end.state,'visible',`${kind}: full target surface visibility at the goal`);
  assert.equal(end.visible,end.tested);
  const point=model.target.position.clone().add(new T.Vector3(0,kind==='occlusion'?.115:.06,0));
  const direction=point.sub(model.eye.position).normalize();
  assert.ok(model.eye.getWorldDirection(new T.Vector3()).dot(direction)>.999,'Goal optical axis must face the actual target');
  const targetSize=new T.Box3().setFromObject(model.target).getSize(new T.Vector3()).toArray();
  // Conservative AABBs enclose the prop meshes, expanded by 8 mm for clearance.
  // Robot geometry is tested as world-space triangles, with a local BVH broad phase.
  const props=[...model.solids,model.target].map(object=>({name:object.name||object.parent.name||'shelf object',bounds:new T.Box3().setFromObject(object).expandByScalar(.008)}));
  const collisions=[],states=[];
  for(let sample=0;sample<=200;sample++){
    const progress=sample/200,result=model.pose(progress);
    if(sample%50===0)states.push({progress,...result});
    for(const mesh of meshes)for(const prop of props)if(meshIntersectsBox(mesh,bvhCache.get(mesh.geometry),prop.bounds)){
      let link=mesh.parent;while(link&&!link.name)link=link.parent;
      collisions.push({progress,link:link?.name,prop:prop.name});
    }
  }
  report.push({kind,robotMeshes:meshes.length,propBounds:props.length,poses:201,clearanceMm:8,targetSizeMeters:targetSize,states,collisions});
  assert.equal(collisions.length,0,JSON.stringify({kind,collisions:collisions.slice(0,10)}));
}
console.log(JSON.stringify(report,null,2));
console.log('PASS: actual initial/goal optical conditions, aim direction, and 402 robot poses clear all scene props with 8 mm expansion.');
// This is an illustrative kinematic scene, not a dynamics or robot self-collision certification.
