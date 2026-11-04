import * as T from './vendor/three.module.min.js';

const initial = {
  table: {x: .95, y: 0, height: .85, width: .8, depth: 1.2},
  bag: {x: .87, y: .06, height: .16, width: .32, depth: .28, yaw: 0},
  roll: 0
};
const storageKey = 'activeScale.backpack.scene.v1';

function mesh(width, height, depth, color) {
  return new T.Mesh(new T.BoxGeometry(width, height, depth), new T.MeshStandardMaterial({color, roughness: .78}));
}

export function createReplayScene(scene, container, onChange) {
  let settings = structuredClone(initial);
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved) settings = {table: {...initial.table, ...saved.table}, bag: {...initial.bag, ...saved.bag}, roll: saved.roll ?? 0};
  } catch {}
  const table = new T.Group();
  const top = mesh(1, .04, 1, '#b49b7d');
  const legs = [...Array(4)].map(() => mesh(.045, 1, .045, '#596166'));
  table.add(top, ...legs);
  const bag = new T.Group();
  const body = mesh(1, 1, 1, '#303b3f');
  const rimMaterial = new T.MeshStandardMaterial({color: '#424f53', roughness: .9});
  const rim = new T.Mesh(new T.TorusGeometry(.41, .055, 8, 28), rimMaterial);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = .51;
  const opening = new T.Mesh(new T.CircleGeometry(.38, 28), new T.MeshBasicMaterial({color: '#151c1f'}));
  opening.rotation.x = -Math.PI / 2;
  opening.position.y = .515;
  body.scale.set(1, .85, 1);
  bag.add(body, rim, opening);
  scene.add(table, bag);

  const details = document.createElement('details');
  details.className = 'recorded-scene-settings';
  details.innerHTML = '<summary>Adjust the draft table and backpack</summary><p>Positions are in meters from the robot base. X is forward, Y is left, and Z is up. These blocks are scene references.</p>';
  const grid = document.createElement('div');
  grid.className = 'recorded-scene-grid';
  details.append(grid);
  container.append(details);
  const inputs = [];

  function update() {
    const t = settings.table, b = settings.bag;
    top.position.set(t.x, t.height, -t.y);
    top.scale.set(t.width, 1, t.depth);
    legs.forEach((leg, i) => {
      const x = (i % 2 ? 1 : -1) * (t.width / 2 - .05);
      const y = (i > 1 ? 1 : -1) * (t.depth / 2 - .05);
      leg.position.set(t.x + x, t.height / 2, -t.y + y);
      leg.scale.y = t.height;
    });
    bag.position.set(b.x, t.height + .02 + b.height / 2, -b.y);
    bag.scale.set(b.width, b.height, b.depth);
    bag.rotation.y = -T.MathUtils.degToRad(b.yaw);
  }

  function fieldset(title) {
    const group = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = title;
    group.append(legend);
    grid.append(group);
    return group;
  }

  function field(group, title, path, minimum, maximum, step) {
    const label = document.createElement('label');
    const name = document.createElement('span');
    name.textContent = title;
    const input = document.createElement('input');
    input.type = 'number';
    input.min = minimum;
    input.max = maximum;
    input.step = step;
    input.setAttribute('aria-label', group.querySelector('legend').textContent + ' ' + title);
    const read = () => path.reduce((value, key) => value[key], settings);
    input.value = read();
    input.addEventListener('change', () => {
      const value = input.valueAsNumber;
      if (!Number.isFinite(value)) {input.value = read(); return;}
      const parent = path.slice(0, -1).reduce((value, key) => value[key], settings);
      parent[path.at(-1)] = T.MathUtils.clamp(value, minimum, maximum);
      input.value = read();
      try {localStorage.setItem(storageKey, JSON.stringify(settings));} catch {}
      update();
      onChange();
    });
    inputs.push(() => {input.value = read();});
    label.append(name, input);
    group.append(label);
  }

  const tableFields = fieldset('Table');
  field(tableFields, 'Forward X', ['table', 'x'], -.5, 2.5, .01);
  field(tableFields, 'Left Y', ['table', 'y'], -2, 2, .01);
  field(tableFields, 'Top height Z', ['table', 'height'], .3, 1.4, .01);
  field(tableFields, 'Size along X', ['table', 'width'], .2, 2, .01);
  field(tableFields, 'Size along Y', ['table', 'depth'], .2, 2.5, .01);
  const bagFields = fieldset('Backpack');
  field(bagFields, 'Forward X', ['bag', 'x'], -.5, 2.5, .01);
  field(bagFields, 'Left Y', ['bag', 'y'], -2, 2, .01);
  field(bagFields, 'Height', ['bag', 'height'], .05, .6, .01);
  field(bagFields, 'Size along X', ['bag', 'width'], .1, .7, .01);
  field(bagFields, 'Size along Y', ['bag', 'depth'], .1, .7, .01);
  field(bagFields, 'Yaw (°)', ['bag', 'yaw'], -180, 180, 5);
  const optics = fieldset('Image orientation');
  field(optics, 'Additional roll (°)', ['roll'], -180, 180, 90);
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = 'Reset draft placement';
  reset.addEventListener('click', () => {
    settings = structuredClone(initial);
    try {localStorage.removeItem(storageKey);} catch {}
    inputs.forEach(refresh => refresh());
    update();
    onChange();
  });
  details.append(reset);
  update();
  return {
    get roll() {return settings.roll;},
    set visible(value) {table.visible = bag.visible = value;}
  };
}
