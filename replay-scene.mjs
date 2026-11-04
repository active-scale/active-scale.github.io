import * as T from './vendor/three.module.min.js';

function box(x, y, z, material) {
  return new T.Mesh(new T.BoxGeometry(x, y, z), material);
}

export function createReplayScene(scene) {
  const root = new T.Group();
  const wood = new T.MeshStandardMaterial({color: '#e6e5df', roughness: .82});
  const steel = new T.MeshStandardMaterial({color: '#d5dbdd', metalness: .30, roughness: .28});
  const dark = new T.MeshStandardMaterial({color: '#30383b', roughness: .58});
  const surface = .79;
  const table = new T.Group();
  table.position.set(.60, 0, 0);
  const top = box(.74, .035, 1.08, wood);
  top.position.y = surface;
  table.add(top);
  for (const x of [-.32, .32]) for (const z of [-.48, .48]) {
    const leg = box(.038, surface, .038, dark);
    leg.position.set(x, surface / 2, z);
    table.add(leg);
  }
  root.add(table);

  const pot = new T.Group();
  pot.position.set(.59, surface + .022, -.02);
  const profile = [
    new T.Vector2(0, 0), new T.Vector2(.10, 0), new T.Vector2(.116, .018),
    new T.Vector2(.119, .131), new T.Vector2(.112, .133), new T.Vector2(.108, .019),
    new T.Vector2(.097, .009), new T.Vector2(0, .009)
  ];
  pot.add(new T.Mesh(new T.LatheGeometry(profile, 48), steel));
  const rim = new T.Mesh(new T.TorusGeometry(.116, .005, 8, 48), steel);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = .132;
  pot.add(rim);
  for (const side of [-1, 1]) {
    const handle = new T.Mesh(new T.TorusGeometry(.035, .008, 8, 24, Math.PI), dark);
    handle.rotation.y = Math.PI / 2;
    handle.position.set(side * .12, .091, 0);
    pot.add(handle);
  }
  const lid = new T.Group();
  const lidShape = new T.Mesh(new T.SphereGeometry(.117, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2), steel);
  lidShape.scale.y = .15;
  lid.add(lidShape);
  const knob = new T.Mesh(new T.CylinderGeometry(.021, .024, .018, 24), dark);
  knob.position.y = .027;
  lid.add(knob);
  lid.position.set(.53, surface + .027, .29);
  root.add(pot, lid);

  const shelf = new T.Group();
  shelf.position.set(.22, 0, -.94);
  for (const x of [-.24,.24]) {
    for (const z of [-.13,.13]) {
      const post = box(.025, 1.12, .025, dark);
      post.position.set(x, .56, z);
      shelf.add(post);
    }
  }
  for (const y of [.29,.64,1.0]) {
    const plank = box(.54,.025,.32,wood);
    plank.position.y=y;shelf.add(plank);
  }
  const onion = new T.Mesh(new T.SphereGeometry(.036,24,18),new T.MeshStandardMaterial({color:'#8a426d',roughness:.8}));
  onion.scale.set(1,.89,1);onion.position.set(.22,.689,-.94);
  const stem = new T.Mesh(new T.ConeGeometry(.009,.022,10),new T.MeshStandardMaterial({color:'#af8c56'}));
  stem.position.y=.04;onion.add(stem);
  root.add(shelf,onion);
  scene.add(root);
  return {
    roll: 0,
    set visible(value) {root.visible = value;},
    update() {},
  };
}
