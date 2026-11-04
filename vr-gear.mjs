import * as T from './vendor/three.module.min.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

export async function createQuestGear() {
  const loader=new GLTFLoader();
  const [headsetFile,rightFile,leftFile]=await Promise.all(['headset','right','left'].map(name=>loader.loadAsync(new URL(`./assets/quest2/${name}.glb`,import.meta.url).href)));
  const original=headsetFile.scene;original.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(original);
  const scale=.210/(bounds.max.x-bounds.min.x),centerX=(bounds.max.x+bounds.min.x)/2;
  const headset=new T.Group();
  original.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const geometry=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    const positions=geometry.attributes.position;
    for(let index=0;index<positions.count;index++){
      let x=positions.getX(index),y=positions.getY(index),z=positions.getZ(index);
      // Repose the source's unworn, elongated fabric straps around the avatar's skull.
      // The visor and its camera/sensor details retain their original proportions.
      if(z<-.05)z=-.05+(z+.05)*.46;
      if(y>.10)y=.10+(y-.10)*.23;
      positions.setXYZ(index,(x-centerX)*scale,y*scale+.095,z*scale+.068);
    }
    positions.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const fitted=new T.Mesh(geometry,mesh.material.clone());fitted.material.roughness=Math.max(.45,fitted.material.roughness);headset.add(fitted);
  });
  const controllers=[rightFile.scene,leftFile.scene].map(model=>{
    const grip=new T.Group();
    // Standard WebXR grip frame: turn -Z forward into the hand frame's +Z.
    model.rotation.y=Math.PI;
    model.position.set(0,.006,.005);
    grip.add(model);return grip;
  });
  headset.position.y = -.055;
  return {headset,controllers};
}
