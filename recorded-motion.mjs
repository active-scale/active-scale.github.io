import * as T from './vendor/three.module.min.js';

export function recordedFrame(episode, seconds) {
  const sample = T.MathUtils.clamp(seconds * episode.fps, 0, episode.frameCount - 1);
  const first = Math.floor(sample);
  return {first, second: Math.min(first + 1, episode.frameCount - 1), blend: sample - first};
}

export function recordedJoints(episode, seconds, calibration) {
  const {first, second, blend} = recordedFrame(episode, seconds);
  const joints = {};
  for (const [index, name] of ['left', 'right', 'center'].entries()) {
    joints[name] = {};
    const offset = index * 7;
    for (let j = 0; j < 6; j++) {
      joints[name]['joint' + (j + 1)] = T.MathUtils.lerp(
        episode.qpos[first][offset + j], episode.qpos[second][offset + j], blend
      ) * 180 / Math.PI;
    }
    // The author confirmed 0 = closed and 0.1 = fully open.
    const rawOpening = T.MathUtils.lerp(episode.qpos[first][offset + 6], episode.qpos[second][offset + 6], blend);
    const slideMm = T.MathUtils.clamp(rawOpening / .1, 0, 1) * 35;
    joints[name].joint7 = name === 'center' ? 0 : slideMm;
    joints[name].joint8 = name === 'center' ? 0 : -slideMm;
  }
  return {...calibration, joints};
}

export function setRecordedOptics(camera, episode, name, seconds, rig, rollDegrees = 0) {
  const {first, second, blend} = recordedFrame(episode, seconds);
  const values = episode.cameraPoses[name];
  const position = new T.Vector3().fromArray(values[first]).lerp(new T.Vector3().fromArray(values[second]), blend);
  const rotation = new T.Quaternion().fromArray(values[first].slice(3)).slerp(
    new T.Quaternion().fromArray(values[second].slice(3)), blend
  );
  const base = rig.arms.center.root;
  base.updateWorldMatrix(true, false);
  const baseRotation = base.getWorldQuaternion(new T.Quaternion());
  position.z -= .25;
  camera.position.copy(base.localToWorld(position));
  // Source optical axes are x-right, y-down, z-forward. Three cameras use y-up/-z.
  camera.quaternion.copy(baseRotation).multiply(rotation).multiply(
    new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI)
  );
  camera.rotateZ(T.MathUtils.degToRad(rollDegrees));
  const [fx, , cx, , fy, cy] = episode.cameraIntrinsics[name].K;
  const near = .02, far = 30, width = 640, height = 480;
  camera.projectionMatrix.makePerspective(
    -cx * near / fx, (width - cx) * near / fx,
    cy * near / fy, -(height - cy) * near / fy, near, far
  );
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  camera.near = near;
  camera.far = far;
  camera.aspect = width / height;
  camera.updateMatrixWorld(true);
}
