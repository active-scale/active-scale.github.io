import * as T from './vendor/three.module.min.js';
import {defaults} from './assets/robot-models/amp.mjs?v=20261104slots1';
import {recordedJoints} from './recorded-motion.mjs?v=20261104k';

function box(x, y, z, material) {
  return new T.Mesh(new T.BoxGeometry(x, y, z), material);
}

export function createReplayScene(scene) {
  const root = new T.Group();
  root.name = 'Recorded Pot scene';
  const wood = new T.MeshStandardMaterial({color: '#e6e5df', roughness: .82});
  const steel = new T.MeshStandardMaterial({color: '#d5dbdd', metalness: .30, roughness: .28});
  const dark = new T.MeshStandardMaterial({color: '#30383b', roughness: .58});
  const surface = .79;
  const table = new T.Group();
  table.name = 'Table';
  // Keep the near edge at X=.35 m, clear of the frame and arm bases.
  // The far edge and object/grasp anchors stay fixed in the recorded workspace.
  table.position.set(.66, 0, 0);
  const top = box(.62, .035, 1.08, wood);
  top.name = 'Tabletop';
  top.position.y = surface;
  table.add(top);
  for (const x of [-.26, .26]) for (const z of [-.48, .48]) {
    const leg = box(.038, surface, .038, dark);
    leg.name = `Table leg ${x < 0 ? 'near' : 'far'} ${z < 0 ? 'left' : 'right'}`;
    leg.position.set(x, surface / 2, z);
    table.add(leg);
  }
  root.add(table);

  const pot = new T.Group();
  pot.name = 'Pot';
  pot.position.set(.548, surface + .035 / 2, .015);
  // Fit the approximate vessel below the recorded lid descent, leaving the recorded hand untouched.
  const potVerticalScale = .72;
  pot.scale.y = potVerticalScale;
  const profile = [
    new T.Vector2(0, 0), new T.Vector2(.10, 0), new T.Vector2(.116, .018),
    new T.Vector2(.119, .131), new T.Vector2(.112, .133), new T.Vector2(.108, .019),
    new T.Vector2(.097, .009), new T.Vector2(0, .009)
  ];
  const potBody = new T.Mesh(new T.LatheGeometry(profile, 48), steel);
  potBody.name = 'Pot body';
  pot.add(potBody);
  const rim = new T.Mesh(new T.TorusGeometry(.116, .005, 8, 48), steel);
  rim.name = 'Pot rim';
  rim.rotation.x = Math.PI / 2;
  rim.position.y = .132;
  pot.add(rim);
  for (const side of [-1, 1]) {
    const handle = new T.Mesh(new T.TorusGeometry(.035, .008, 8, 24, Math.PI), dark);
    handle.name = 'Pot handle';
    handle.rotation.y = Math.PI / 2;
    handle.position.set(side * .12, .091, 0);
    pot.add(handle);
  }
  const lid = new T.Group();
  lid.name = 'Lid';
  const lidShape = new T.Mesh(new T.SphereGeometry(.117, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2), steel);
  lidShape.name = 'Lid crown';
  lidShape.scale.y = .15;
  lid.add(lidShape);
  const knob = new T.Mesh(new T.CylinderGeometry(.014, .014, .020, 48), dark);
  knob.name = 'Lid knob';
  knob.position.y = .027;
  const knobCollar = new T.Mesh(new T.CylinderGeometry(.009, .012, 1, 32), dark);
  knobCollar.name = 'Lid knob collar';
  lid.add(knob, knobCollar);
  lid.position.set(.56, surface + .027, .28);
  root.add(pot, lid);

  const shelf = new T.Group();
  shelf.name = 'Shelf';
  shelf.position.set(.45, 0, -.73);
  for (const x of [-.24,.24]) {
    for (const z of [-.13,.13]) {
      const post = box(.025, 1.14, .025, dark);
      post.position.set(x, .57, z);
      shelf.add(post);
    }
  }
  const shelfTop = box(.54,.025,.32,wood);
  shelf.add(shelfTop);
  for (const y of [.29,.64]) {
    const plank = box(.54,.025,.32,wood);
    plank.position.y=y;shelf.add(plank);
  }
  const onion = new T.Mesh(new T.SphereGeometry(.036,24,18),new T.MeshStandardMaterial({color:'#8a426d',roughness:.8}));
  onion.name = 'Onion';
  onion.scale.set(1,.89,1);onion.position.set(.49,1.079,-.628);
  const stem = new T.Mesh(new T.ConeGeometry(.009,.022,10),new T.MeshStandardMaterial({color:'#af8c56'}));
  stem.position.y=.04;onion.add(stem);
  root.add(shelf,onion);
  scene.add(root);
  // Contact intervals are read from episode 38's three camera streams, not physics estimates.
  const timing = {onionPick: 8.07, onionRelease: 13.25, onionRest: 13.57, lidPick: 20.1, lidRelease: 25.1, lidLevel: 25.42, lidRest: 25.8};
  const calibration = structuredClone(defaults);
  const identity = new T.Quaternion();
  const toolOffset = new T.Matrix4();
  let preparedEpisode, anchors;

  function toolPose(rig, name, reach) {
    const frame = rig.arms[name].links.link6;
    frame.updateWorldMatrix(true, false);
    if (typeof reach === 'number') toolOffset.makeTranslation(0, 0, reach);
    else toolOffset.makeTranslation(reach.x, reach.y, reach.z);
    const matrix = frame.matrixWorld.clone().multiply(toolOffset);
    const position = new T.Vector3(), rotation = new T.Quaternion();
    matrix.decompose(position, rotation, new T.Vector3());
    return {position, rotation};
  }

  function fingerBounds(arm, name) {
    const mesh = arm.links[name].children.find(object => object.isMesh);
    mesh.updateWorldMatrix(true, false);
    const toTool = arm.links.link6.matrixWorld.clone().invert().multiply(mesh.matrixWorld);
    const position = mesh.geometry.attributes.position;
    const bounds = new T.Box3(), point = new T.Vector3();
    for (let index = 0; index < position.count; index++) {
      bounds.expandByPoint(point.fromBufferAttribute(position, index).applyMatrix4(toTool));
    }
    return bounds;
  }

  function prepare(episode, rig, seconds) {
    function sample(time, arm, reach) {
      rig.pose(recordedJoints(episode, time, calibration));
      return toolPose(rig, arm, reach);
    }
    const onionPick = sample(timing.onionPick, 'left', .105);
    const onionRelease = sample(timing.onionRelease, 'left', .105);
    sample(timing.lidPick, 'right', 0);
    const right = rig.arms.right;
    const leftFinger = fingerBounds(right, 'link7');
    const rightFinger = fingerBounds(right, 'link8');
    // Use the opposing inner finger pads, rather than an arbitrary flange offset.
    const gripPoint = new T.Vector3(0, (leftFinger.max.y + rightFinger.min.y) / 2,
      Math.min(leftFinger.max.z, rightFinger.max.z) - .006);
    const lidGrip = toolPose(rig, 'right', gripPoint);
    const lidStart = lidGrip.position.clone();
    // Sub-millimeter clearance avoids rim flicker during the recorded pre-lift adjustment.
    lidStart.y = surface + .035 / 2 + .0004;
    const knobHeight = lidGrip.position.y - lidStart.y;
    const axisInTool = new T.Vector3(0, 1, 0).applyQuaternion(lidGrip.rotation.clone().invert());
    const halfGap = (rightFinger.min.y - leftFinger.max.y) / 2;
    const knobRadius = halfGap * Math.sqrt(1 - axisInTool.y ** 2);
    knob.geometry.dispose();
    knob.geometry = new T.CylinderGeometry(knobRadius, knobRadius, .020, 48);
    knob.position.y = knobHeight;
    // The unsurveyed lid crown is fitted to this recorded grasp while its base rests on the table.
    const crownHeight = knobHeight - .014;
    lidShape.scale.y = crownHeight / .117;
    knobCollar.scale.y = .004;
    knobCollar.position.y = crownHeight + .002;
    const lidOffset = right.links.link6.worldToLocal(lidStart);
    const lidPick = toolPose(rig, 'right', lidOffset);
    const lidRelease = sample(timing.lidRelease, 'right', lidOffset);
    rig.pose(recordedJoints(episode, seconds, calibration));
    const onionRest = new T.Vector3(onionRelease.position.x, pot.position.y + .009 * potVerticalScale + .036 * .89, onionRelease.position.z);
    // The torus rim peaks at .137 m before vertical scaling. A 0.1 mm rendering clearance
    // keeps the seated lid above that support instead of lifting it through the closing hand.
    const lidRest = pot.position.clone().add(new T.Vector3(0, .137 * potVerticalScale + .0001, 0));
    const onionPickInverse = onionPick.rotation.clone().invert();
    const lidPickInverse = lidPick.rotation.clone().invert();
    anchors = {onionPick, onionRelease, onionRest, onionPickInverse, lidPick, lidRelease, lidRest, lidPickInverse, lidOffset};
    // The upper preview shelf meets the measured left-hand pickup position.
    // Its dimensions and the rest of this scene are illustrative, not a surveyed reconstruction.
    shelf.position.x = onionPick.position.x - .04;
    shelf.position.z = onionPick.position.z - .08;
    shelfTop.position.y = onionPick.position.y - .036 * .89 - .0125;
    preparedEpisode = episode;
  }

  function follow(object, rig, name, reach, pickupInverse) {
    const pose = toolPose(rig, name, reach);
    object.position.copy(pose.position);
    object.quaternion.copy(pose.rotation).multiply(pickupInverse);
  }

  function settle(object, seconds, releaseTime, restTime, releasePose, pickupInverse, restPosition) {
    const blend = T.MathUtils.smoothstep(seconds, releaseTime, restTime);
    object.position.copy(releasePose.position).lerp(restPosition, blend);
    object.quaternion.copy(releasePose.rotation).multiply(pickupInverse).slerp(identity, blend);
  }

  function settleLid(seconds) {
    const release = anchors.lidRelease;
    lid.quaternion.copy(release.rotation).multiply(anchors.lidPickInverse);
    if (seconds < timing.lidLevel) {
      const up = new T.Vector3(0, 1, 0).applyQuaternion(lid.quaternion);
      const supportedHeight = anchors.lidRest.y + .117 * Math.sqrt(Math.max(0, 1 - up.y ** 2));
      const blend = T.MathUtils.smoothstep(seconds, timing.lidRelease, timing.lidLevel);
      lid.position.copy(release.position);
      lid.position.y = T.MathUtils.lerp(release.position.y, supportedHeight, blend);
      return;
    }
    // Let the jaws open before leveling and centering the cover on the rim.
    const blend = T.MathUtils.smoothstep(seconds, timing.lidLevel, timing.lidRest);
    lid.quaternion.slerp(identity, blend);
    lid.position.copy(release.position).lerp(anchors.lidRest, blend);
    const up = new T.Vector3(0, 1, 0).applyQuaternion(lid.quaternion);
    lid.position.y = anchors.lidRest.y + .117 * Math.sqrt(Math.max(0, 1 - up.y ** 2));
  }

  return {
    roll: 0,
    set visible(value) {root.visible = value;},
    update(seconds, episode, rig) {
      if (!root.visible || episode.task !== 'pick_things_from_shelf_and_place_on_pot') return;
      if (preparedEpisode !== episode) prepare(episode, rig, seconds);
      if (seconds < timing.onionPick) {
        onion.position.copy(anchors.onionPick.position);
        onion.quaternion.identity();
      } else if (seconds < timing.onionRelease) {
        follow(onion, rig, 'left', .105, anchors.onionPickInverse);
      } else {
        settle(onion, seconds, timing.onionRelease, timing.onionRest, anchors.onionRelease, anchors.onionPickInverse, anchors.onionRest);
      }
      if (seconds < timing.lidPick) {
        lid.position.copy(anchors.lidPick.position);
        lid.quaternion.identity();
      } else if (seconds < timing.lidRelease) {
        follow(lid, rig, 'right', anchors.lidOffset, anchors.lidPickInverse);
      } else {
        settleLid(seconds);
      }
    },
  };
}
