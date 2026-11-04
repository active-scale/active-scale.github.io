// Dimensions and finish supplied by the project author. The exact product
// variant is tentative; no manufacturer cross-section or hole pattern is available.
export const mastSpec = Object.freeze({
  width: .100,
  depth: .100,
  defaultHeight: .300,
  finish: 'Silver-anodized aluminum',
  candidateModel: 'HD-OB100100H-Y',
  candidateVariant: 'Euro profile 2.0, silver anodized',
  mounting: 'Custom-drilled mounting holes',
});

// A generic double T-slot section illustrates the visible longitudinal channels.
// Outer dimensions are verified. Slot widths/depths are illustrative, with no
// inferred mounting holes or manufacturer-specific internal cavities.
export function createMast(THREE, height = mastSpec.defaultHeight) {
  const halfWidth = mastSpec.width / 2;
  const halfDepth = mastSpec.depth / 2;
  const corners = [
    [-halfWidth, -halfDepth], [halfWidth, -halfDepth],
    [halfWidth, halfDepth], [-halfWidth, halfDepth],
  ];
  const section = new THREE.Shape();
  section.moveTo(...corners[0]);
  for (let edge = 0; edge < corners.length; edge++) {
    const start = new THREE.Vector2(...corners[edge]);
    const end = new THREE.Vector2(...corners[(edge + 1) % corners.length]);
    const along = end.clone().sub(start);
    const length = along.length();
    along.normalize();
    const inward = new THREE.Vector2(-along.y, along.x);
    const point = (distance, recess) => {
      const p = start.clone().addScaledVector(along, distance).addScaledVector(inward, recess);
      section.lineTo(p.x, p.y);
    };
    for (const fraction of [.25, .75]) {
      const center = fraction * length;
      point(center - .004, 0);
      point(center - .004, .002);
      point(center - .007, .002);
      point(center - .007, .009);
      point(center + .007, .009);
      point(center + .007, .002);
      point(center + .004, .002);
      point(center + .004, 0);
    }
    point(length, 0);
  }
  section.closePath();
  const geometry = new THREE.ExtrudeGeometry(section, {depth: height, bevelEnabled: false, steps: 1});
  geometry.translate(0, 0, -height / 2);

  // Darken only recessed side walls, keeping end faces and outer lips silver.
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  geometry.clearGroups();
  let materialIndex = -1;
  for (let first = 0; first < positions.count; first += 3) {
    const x = (positions.getX(first) + positions.getX(first + 1) + positions.getX(first + 2)) / 3;
    const y = (positions.getY(first) + positions.getY(first + 1) + positions.getY(first + 2)) / 3;
    const endFace = Math.abs(normals.getZ(first)) > .5;
    const outerFace = Math.abs(x) > halfWidth - .0005 || Math.abs(y) > halfDepth - .0005;
    const nextMaterial = endFace || outerFace ? 0 : 1;
    if (nextMaterial === materialIndex) geometry.groups.at(-1).count += 3;
    else {
      geometry.addGroup(first, 3, nextMaterial);
      materialIndex = nextMaterial;
    }
  }
  const aluminum = new THREE.MeshStandardMaterial({color: '#b8c1c5', metalness: .50, roughness: .42});
  const recess = new THREE.MeshStandardMaterial({color: '#5d6a70', metalness: .32, roughness: .56});
  const mast = new THREE.Mesh(geometry, [aluminum, recess]);
  mast.name = 'Silver aluminum extrusion with vertical T-slots';
  return mast;
}
