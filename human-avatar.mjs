import * as T from './vendor/three.module.min.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

const source = new URL('./assets/human-base-rigged.glb', import.meta.url);
const up = new T.Vector3(0, 1, 0);
const forward = new T.Vector3(0, 0, 1);

function paintWorkwear(scene) {
  const colors = {
    skin: new T.Color('#b98368'), shirt: new T.Color('#40626b'),
    pants: new T.Color('#303b43'), shoes: new T.Color('#252c2d'), hair: new T.Color('#3e2f2b'),
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
        : y < .936 && Math.abs(x) < .30 ? colors.pants
        : y < 1.433 && Math.abs(x) < .275 ? colors.shirt
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
  scene.position.set(x, 0, -.12);
  const bone = name => scene.getObjectByName(name);
  const chest = bone('spine_03');
  const neck = bone('neck_01');
  const head = bone('head');
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

  function pose({reach, lift, turn, object, handTargets, holdingControllers = false}) {
    for (const [joint, rotation] of rest) joint.quaternion.copy(rotation);
    chest.rotateX(.08 * reach);
    chest.rotateY(-.08 * reach);
    neck.rotateY(turn);
    head.rotateX(.16 * reach + .05);
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
    return {
      headPosition: head.getWorldPosition(new T.Vector3()),
      headRotation: head.getWorldQuaternion(new T.Quaternion()),
      hands: frames,
      controllerGrips,
    };
  }

  return {scene, pose};
}
