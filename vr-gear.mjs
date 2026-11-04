import * as T from './vendor/three.module.min.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

// Geometry is sourced, not procedurally approximated. See assets/quest2/README.md.
export async function createQuestGear() {
  const loader = new GLTFLoader();
  const [headsetFile, rightFile, leftFile] = await Promise.all(
    ['headset', 'right', 'left'].map(name => loader.loadAsync(new URL(`./assets/quest2/${name}.glb`, import.meta.url).href))
  );
  const headset = new T.Group();
  const model = headsetFile.scene;
  model.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(model);
  const scale = .218 / (bounds.max.x - bounds.min.x);
  model.scale.multiplyScalar(scale);
  model.position.set(-(bounds.max.x + bounds.min.x) * .5 * scale, .070, .140 - bounds.max.z * scale);
  headset.add(model);
  const controllers = [rightFile.scene, leftFile.scene].map(model => {
    const grip = new T.Group();
    // WebXR models use -Z forward; the illustrative hand frames use +Z.
      model.position.z = -.014;
    grip.add(model);
    return grip;
  });
  return {headset, controllers};
}
