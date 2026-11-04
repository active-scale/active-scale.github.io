import * as T from './vendor/three.module.min.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

const source = new URL('./assets/human-base-rigged.glb', import.meta.url);
const up = new T.Vector3(0, 1, 0);
const forward = new T.Vector3(0, 0, 1);

function paintWorkwear(scene) {
  const colors = {
    skin: new T.Color('#b98368'), shirt: new T.Color('#171b1e'),
    pants: new T.Color('#1a1e21'), shoes: new T.Color('#252c2d'), hair: new T.Color('#17191a'),
  };
  scene.updateMatrixWorld(true);
  scene.traverse(mesh => {
    if (!mesh.isSkinnedMesh) return;
    const positions = mesh.geometry.getAttribute('position');
    const rgb = new Float32Array(positions.count * 3);
    const point = new T.Vector3();
    for (let i = 0; i < positions.count; i++) {
      mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
      const {x, y, z} = point;
      const color = y < .118 ? colors.shoes
        : y >= .60 && y < .936 && Math.abs(x) < .30 ? colors.pants
        : y >= .925 && y < 1.433 && Math.abs(x) < .275 ? colors.shirt
        : y > 1.592 && z < .07 ? colors.hair
        : colors.skin;
      color.toArray(rgb, i * 3);
    }
    mesh.geometry.setAttribute('color', new T.BufferAttribute(rgb, 3));
    mesh.material.color.set('#ffffff');
    mesh.material.vertexColors = true;
    mesh.material.roughness = .82;
    mesh.frustumCulled = false;
  });
}

function addMediumHair(scene, head) {
  scene.updateMatrixWorld(true);
  const toHead = head.matrixWorld.clone().invert();
  const vertices = [];
  const normal = new T.Vector3();
  const point = new T.Vector3();
  const scalp = local => {
    const front = T.MathUtils.smoothstep(local.z, -.025, .075);
    const temple = T.MathUtils.smoothstep(Math.abs(local.x), .050, .080);
    const hairline = .025 + front * (.080 - .018 * temple);
    return local.y > hairline && local.y < .17 && Math.abs(local.x) < .12;
  };
  scene.traverse(mesh => {
    if (!mesh.isSkinnedMesh) return;
    const geometry = mesh.geometry;
    const positions = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    const index = geometry.index;
    const normalTransform = new T.Matrix3().getNormalMatrix(
      toHead.clone().multiply(mesh.matrixWorld)
    );
    const count = index ? index.count : positions.count;
    for (let start = 0; start < count; start += 3) {
      const triangle = [];
      for (let corner = 0; corner < 3; corner++) {
        const vertex = index ? index.getX(start + corner) : start + corner;
        mesh.getVertexPosition(vertex, point).applyMatrix4(mesh.matrixWorld).applyMatrix4(toHead);
        if (!scalp(point)) break;
        normal.fromBufferAttribute(normals, vertex).applyMatrix3(normalTransform).normalize();
        const thickness = .003 + .004 * T.MathUtils.smoothstep(point.y, .055, .145);
        triangle.push(...point.clone().addScaledVector(normal, thickness).toArray());
      }
      if (triangle.length === 9) vertices.push(...triangle);
    }
  });
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  const material = new T.MeshStandardMaterial({color:'#13171a',roughness:.90,side:T.DoubleSide});
  if (typeof document !== 'undefined') {
    const image = document.createElement('canvas');
    image.width = image.height = 128;
    const context = image.getContext('2d');
    context.fillStyle = '#9e9485';context.fillRect(0,0,128,128);
    for (let strand = 0; strand < 1100; strand++) {
      const x = (strand * 47.73) % 128;
      const y = (strand * 71.19) % 128;
      const tone = 70 + Math.round((Math.sin(strand * 2.41) + 1) * 43);
      context.strokeStyle = 'rgb(' + tone + ',' + tone + ',' + tone + ')';
      context.lineWidth = .7;
      context.beginPath();context.moveTo(x,y);
      context.quadraticCurveTo(x + 1.2,y + 2.2,x + 2.4,y + 4.4);context.stroke();
    }
    const texture = new T.CanvasTexture(image);
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.repeat.set(2,2);
    // Fine, dark fibres follow the scalp and the longer side and nape sections.
    const hairPositions = geometry.getAttribute('position');
    const uv = new Float32Array(hairPositions.count * 2);
    for (let vertex = 0; vertex < hairPositions.count; vertex++) {
      const x = hairPositions.getX(vertex), z = hairPositions.getZ(vertex);
      uv[vertex * 2] = (x + .12) / .24;
      uv[vertex * 2 + 1] = (z + .13) / .26;
    }
    geometry.setAttribute('uv',new T.BufferAttribute(uv,2));
    material.map = texture;material.bumpMap = texture;material.bumpScale = .0006;
  }
  const hair = new T.Mesh(geometry,material);
  hair.name = 'Fitted medium-length hair';
  const lengths = 14, sections = 48;
  const curtainPositions = [], curtainUv = [], curtainIndices = [];
  for (let row = 0; row <= lengths; row++) {
    const down = row / lengths;
    for (let section = 0; section <= sections; section++) {
      const around = section / sections;
      const opening = 1.03 + .40 * down;
      const angle = opening + around * (Math.PI * 2 - opening * 2);
      const back = (1 - Math.cos(angle)) / 2;
      const lock = .0038 * Math.sin(angle * 11 + down * 3) * Math.sin(down * Math.PI);
      const width = .092 + .014 * Math.sin(down * Math.PI) - .009 * down + lock;
      const depth = .094 + .013 * down + lock;
      const bottom = .23 + .055 * back;
      const tips = .009 * Math.sin(angle * 9 + .4) * down ** 5;
      curtainPositions.push(Math.sin(angle) * width,.075 - bottom * down + tips,
        Math.cos(angle) * depth - .010 - .018 * down);
      curtainUv.push(around,down);
      if (row < lengths && section < sections) {
        const start = row * (sections + 1) + section;
        curtainIndices.push(start,start + sections + 1,start + 1,
          start + 1,start + sections + 1,start + sections + 2);
      }
    }
  }
  const curtainGeometry = new T.BufferGeometry();
  curtainGeometry.setAttribute('position',new T.Float32BufferAttribute(curtainPositions,3));
  curtainGeometry.setAttribute('uv',new T.Float32BufferAttribute(curtainUv,2));
  curtainGeometry.setIndex(curtainIndices);curtainGeometry.computeVertexNormals();
  const curtain = new T.Mesh(curtainGeometry,material);
  curtain.name = 'Ear and nape hair';
  const part = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([
    new T.Vector3(0,.119,.088),new T.Vector3(0,.151,.034),new T.Vector3(0,.151,-.030)
  ]),18,.0008,6,false),new T.MeshStandardMaterial({color:'#4c453c',roughness:1}));
  head.add(hair,curtain,part);

  // Roots follow the scalp while the lengths hang along the neck and shoulders.
  // This keeps a downward head turn from swinging the hair out as one rigid sheet.
  head.updateWorldMatrix(true,false);
  const neck = head.parent;
  const rest = Float32Array.from(curtainPositions);
  const neckInverse = neck.matrixWorld.clone().invert();
  const neckCoordinates = [];
  const sample = new T.Vector3();
  for (let index = 0; index < rest.length; index += 3) {
    sample.fromArray(rest,index).applyMatrix4(head.matrixWorld).applyMatrix4(neckInverse);
    neckCoordinates.push(...sample.toArray());
  }
  const headInverse = new T.Matrix4();
  const hanging = new T.Vector3();
  const updateDrape = () => {
    head.updateWorldMatrix(true,false);
    headInverse.copy(head.matrixWorld).invert();
    const positions = curtainGeometry.getAttribute('position');
    for (let vertex = 0; vertex < positions.count; vertex++) {
      const down = Math.floor(vertex / (sections + 1)) / lengths;
      const blend = T.MathUtils.smoothstep(down,.08,.78);
      hanging.fromArray(neckCoordinates,vertex * 3).applyMatrix4(neck.matrixWorld).applyMatrix4(headInverse);
      sample.fromArray(rest,vertex * 3).lerp(hanging,blend);
      positions.setXYZ(vertex,sample.x,sample.y,sample.z);
    }
    positions.needsUpdate = true;
    curtainGeometry.computeVertexNormals();
    curtainGeometry.computeBoundingSphere();
  };
  curtain.onBeforeRender = updateDrape;
  return updateDrape;
}

function addClothing(scene) {
  const shirtMaterial = new T.MeshStandardMaterial({color:'#171b1e',roughness:.94});
  const shortsMaterial = new T.MeshStandardMaterial({color:'#1a1e21',roughness:.94});
  const bodyMeshes = [];
  scene.traverse(mesh => {if (mesh.isSkinnedMesh) bodyMeshes.push(mesh);});
  for (const body of bodyMeshes) {
    const geometry = body.geometry.clone();
    const positions = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    const sourceIndex = body.geometry.index;
    const shirtVertices = [];
    const flags = [];
    const point = new T.Vector3();
    for (let vertex = 0; vertex < positions.count; vertex++) {
      body.getVertexPosition(vertex,point).applyMatrix4(body.matrixWorld);
      flags[vertex] = point.y > .925 && point.y < 1.433 && Math.abs(point.x) < .285;
      positions.setXYZ(vertex,positions.getX(vertex) + normals.getX(vertex) * .0035,
        positions.getY(vertex) + normals.getY(vertex) * .0035,
        positions.getZ(vertex) + normals.getZ(vertex) * .0035);
    }
    const count = sourceIndex ? sourceIndex.count : positions.count;
    for (let first = 0; first < count; first += 3) {
      const triangle = [0,1,2].map(corner => sourceIndex ? sourceIndex.getX(first + corner) : first + corner);
      if (triangle.every(vertex => flags[vertex])) shirtVertices.push(...triangle);
    }
    geometry.setIndex(shirtVertices);geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const shirt = new T.SkinnedMesh(geometry,shirtMaterial);
    shirt.position.copy(body.position);shirt.quaternion.copy(body.quaternion);shirt.scale.copy(body.scale);
    shirt.bind(body.skeleton,body.bindMatrix.clone());
    shirt.frustumCulled = false;shirt.name = 'Black T-shirt';
    body.parent.add(shirt);
  }
  for (const side of ['r','l']) {
    const thigh = scene.getObjectByName('thigh_' + side);
    const leg = new T.Mesh(new T.CylinderGeometry(.080,.103,.28,32,3,true),shortsMaterial);
    leg.position.y = .15;leg.name = 'Black shorts leg';
    const hem = new T.Mesh(new T.RingGeometry(.075,.081,32),shortsMaterial);
    hem.rotation.x = -Math.PI / 2;hem.position.y = .29;
    thigh.add(leg,hem);
  }
}

function pointBoneAt(bone, child, target) {
  const origin = bone.getWorldPosition(new T.Vector3());
  const current = child.getWorldPosition(new T.Vector3()).sub(origin).normalize();
  const desired = target.clone().sub(origin).normalize();
  const world = bone.getWorldQuaternion(new T.Quaternion()).premultiply(
    new T.Quaternion().setFromUnitVectors(current, desired)
  );
  const parent = bone.parent.getWorldQuaternion(new T.Quaternion());
  bone.quaternion.copy(parent.invert().multiply(world));
}

function reachWithArm(arm, target, side) {
  const shoulder = arm.upper.getWorldPosition(new T.Vector3());
  const aim = target.clone().sub(shoulder);
  const distance = Math.min(aim.length(), arm.upperLength + arm.lowerLength - .002);
  aim.normalize();
  const pole = new T.Vector3(side * .63, -.75, -.19).projectOnPlane(aim).normalize();
  const along = (arm.upperLength ** 2 + distance ** 2 - arm.lowerLength ** 2) / (2 * distance);
  const height = Math.sqrt(Math.max(0, arm.upperLength ** 2 - along ** 2));
  const elbow = shoulder.clone().addScaledVector(aim, along).addScaledVector(pole, height);
  pointBoneAt(arm.upper, arm.lower, elbow);
  pointBoneAt(arm.lower, arm.hand, shoulder.addScaledVector(aim, distance));
}

function wrapController(arm, side, wrist) {
  const direction = arm.middle.getWorldPosition(new T.Vector3()).sub(wrist).normalize();
  const across = arm.fingers[0][0].getWorldPosition(new T.Vector3()).sub(
    arm.fingers[3][0].getWorldPosition(new T.Vector3())
  ).projectOnPlane(direction).normalize();
  const right = across.clone().cross(direction).normalize();
  const palm = right.clone().multiplyScalar(-side);
  const center = wrist.clone().addScaledVector(direction, .084).addScaledVector(palm, .021);
  const rotation = new T.Quaternion().setFromRotationMatrix(
    new T.Matrix4().makeBasis(right, across, direction)
  );
  const at = (height, depth, forwardOffset) => center.clone()
    .addScaledVector(across, height).addScaledVector(palm, depth).addScaledVector(direction, forwardOffset);
  arm.fingers.forEach(([first, second, third], index) => {
    const height = first.getWorldPosition(new T.Vector3()).sub(center).dot(across);
    pointBoneAt(first, second, at(height, index ? .025 : .018, index ? .026 : .031));
    pointBoneAt(second, third, at(height, .031, -.009));
    pointBoneAt(third, arm.tips[index], at(height, .012, -.025));
  });
  const [thumbBase, thumbMiddle, thumbEnd] = arm.thumb;
  pointBoneAt(thumbBase, thumbMiddle, at(.055, .027, -.025));
  pointBoneAt(thumbMiddle, thumbEnd, at(.060, .012, .006));
  pointBoneAt(thumbEnd, arm.thumbTip, at(.055, -.003, .018));
  return {position:center, rotation};
}

export async function createHumanAvatar(x) {
  const {scene} = await new GLTFLoader().loadAsync(source.href);
  paintWorkwear(scene);
  addClothing(scene);
  scene.position.set(x, 0, -.12);
  const bone = name => scene.getObjectByName(name);
  const chest = bone('spine_03');
  const neck = bone('neck_01');
  const head = bone('head');
  const updateHair = addMediumHair(scene, head);
  const arms = ['r', 'l'].map(side => {
    const lower = bone('lowerarm_' + side), hand = bone('hand_' + side);
    const fingers = ['index', 'middle', 'ring', 'pinky'].map(finger =>
      ['01', '02', '03'].map(segment => bone(finger + '_' + segment + '_' + side))
    );
    const thumb = ['01', '02', '03'].map(segment => bone('thumb_' + segment + '_' + side));
    const tip = end => {
      const point = new T.Object3D();
      point.position.y = .018;
      end.add(point);
      return point;
    };
    return {
      upper: bone('upperarm_' + side), lower, hand,
      upperLength: lower.position.length(), lowerLength: hand.position.length(),
      middle: bone('middle_01_' + side),
      fingers, thumb,
      tips: fingers.map(chain => tip(chain[2])),
      thumbTip: tip(thumb[2]),
    };
  });
  const rest = new Map([chest, neck, head, ...arms.flatMap(arm => [arm.upper, arm.lower, arm.hand, ...arm.fingers.flat(), ...arm.thumb])]
    .map(joint => [joint, joint.quaternion.clone()]));

  function pose({reach, lift, turn, object, handTargets, holdingControllers = false, headLookDirection}) {
    for (const [joint, rotation] of rest) joint.quaternion.copy(rotation);
    chest.rotateX(.08 * reach);
    chest.rotateY(-.08 * reach);
    neck.rotateY(turn);
    head.rotateX(.16 * reach + .05);
    if (headLookDirection && headLookDirection.lengthSq() > 1e-10) {
      const world = new T.Quaternion().setFromRotationMatrix(
        new T.Matrix4().lookAt(headLookDirection,new T.Vector3(),up)
      );
      const parent = head.parent.getWorldQuaternion(new T.Quaternion());
      head.quaternion.copy(parent.invert().multiply(world));
    }
    const controllerGrips = [];
    const frames = arms.map((arm, i) => {
      const side = i ? 1 : -1;
      const target = new T.Vector3(x + side * .26, .995 + i * .075, .17 - i * .06);
      if (handTargets) target.copy(handTargets[i]);
      else if (!i) target.lerp(object.clone().add(new T.Vector3(-.015, .017, -.105)), reach);
      else target.z += .04 * reach;
      reachWithArm(arm, target, side);
      const wrist = arm.hand.getWorldPosition(new T.Vector3());
      const direction = holdingControllers ? new T.Vector3(side * .06, .38, 1) : i ? new T.Vector3(-.13, -.30, 1) : new T.Vector3(.02, -.31 + .4 * reach + .2 * lift, 1);
      pointBoneAt(arm.hand, arm.middle, wrist.clone().add(direction));
      const rotation = new T.Quaternion().setFromRotationMatrix(
        new T.Matrix4().lookAt(wrist.clone().add(direction), wrist, up)
      );
      if (holdingControllers) {
        const grip = wrapController(arm, side, wrist);
        controllerGrips.push(grip);
        return {position:wrist, rotation:grip.rotation.clone()};
      }
      const curl = i ? .19 : .19 + .30 * reach;
      for (const [first, second, third] of arm.fingers) {
        for (const [joint, tip] of [[first, second], [second, third]]) {
          const jointPosition = joint.getWorldPosition(new T.Vector3());
          const tangent = tip.getWorldPosition(new T.Vector3()).sub(jointPosition).normalize();
          const downward = up.clone().negate().projectOnPlane(tangent).normalize();
          pointBoneAt(joint, tip, jointPosition.add(tangent.addScaledVector(downward, curl)));
        }
      }
      return {position: wrist.addScaledVector(forward.clone().applyQuaternion(rotation), .066), rotation};
    });
    updateHair();
    return {
      headPosition: head.getWorldPosition(new T.Vector3()),
      headRotation: head.getWorldQuaternion(new T.Quaternion()),
      hands: frames,
      controllerGrips,
    };
  }

  return {scene, pose};
}
