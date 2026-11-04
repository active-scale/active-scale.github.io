import * as T from './vendor/three.module.min.js';
import {createHumanAvatar} from './human-avatar.mjs?v=20261104visitor1';

/** A separate instance of the same skinned character used by the operator. */
export async function createVisitorAvatar() {
  const avatar=await createHumanAvatar(0);
  const root=new T.Group();root.name='Rigged visitor';
  const model=avatar.scene;
  model.position.set(0,-.85,0);model.rotation.y=-Math.PI/2;root.add(model);
  const shirt=new T.Color('#3c7064'),shorts=new T.Color('#33475d');
  const oldShirt=new T.Color('#171b1e'),oldShorts=new T.Color('#1a1e21');
  const color=new T.Color(),materials=new Set();
  model.traverse(mesh=>{
    if(!mesh.isMesh)return;
    mesh.material=mesh.material.clone();materials.add(mesh.material);
    if(mesh.name==='Black T-shirt')mesh.material.color.copy(shirt);
    else if(mesh.name==='Black tailored shorts')mesh.material.color.copy(shorts);
    else if(mesh.isSkinnedMesh&&mesh.geometry.getAttribute('color')){
      const colors=mesh.geometry.getAttribute('color');
      for(let n=0;n<colors.count;n++){
        color.fromBufferAttribute(colors,n);
        if(Math.abs(color.r-oldShirt.r)+Math.abs(color.g-oldShirt.g)+Math.abs(color.b-oldShirt.b)<1e-6)colors.setXYZ(n,shirt.r,shirt.g,shirt.b);
        else if(Math.abs(color.r-oldShorts.r)+Math.abs(color.g-oldShorts.g)+Math.abs(color.b-oldShorts.b)<1e-6)colors.setXYZ(n,shorts.r,shorts.g,shorts.b);
      }
      colors.needsUpdate=true;
    }
    mesh.frustumCulled=false;
  });
  const bone=name=>model.getObjectByName(name);
  const hands=['r','l'].map(side=>bone('hand_'+side));
  const thighs=['r','l'].map(side=>bone('thigh_'+side));
  const calves=['r','l'].map(side=>bone('calf_'+side));
  const neutral=new Map([...hands,...thighs,...calves].map(joint=>[joint,joint.quaternion.clone()]));
  const shadow=new T.Mesh(new T.CircleGeometry(.27,32),new T.MeshBasicMaterial({color:'#8d8374',transparent:true,opacity:.14,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=-.846;root.add(shadow);
  const point=(x,y,z)=>model.localToWorld(new T.Vector3(x,y,z));
  function pose(time=0,reaction=0){
    for(const [joint,rotation]of neutral)joint.quaternion.copy(rotation);
    root.updateMatrixWorld(true);
    const armHeight=T.MathUtils.lerp(.94,1.34,reaction);
    const spread=T.MathUtils.lerp(.245,.43,reaction);
    avatar.pose({reach:0,lift:0,turn:0,handTargets:[
      point(-spread,armHeight+.006*Math.sin(time*1.6),.06),
      point(spread,armHeight-.006*Math.sin(time*1.6),.06)
    ]});
    // Keep the wrists relaxed along the forearm, without a controller grip.
    hands.forEach(hand=>hand.quaternion.copy(neutral.get(hand)));
    thighs.forEach((thigh,index)=>{thigh.rotateX((index?-.35:.5)*reaction);});
    calves.forEach((calf,index)=>{calf.rotateX((index?.65:.4)*reaction);});
    root.updateMatrixWorld(true);
  }
  pose();
  return {root,shadow,pose,
    opacity(value){for(const material of materials){material.transparent=value<.999;material.opacity=value;material.depthWrite=value>=.999;}}
  };
}
