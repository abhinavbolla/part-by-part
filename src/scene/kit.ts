// Small building blocks for procedural parts. Everything is in millimetres.
// Boxes and cylinders share one unit geometry each and are sized by scale,
// so a part made of fifty boxes still uploads a single box to the GPU.

import {
  BoxGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D as Node3D,
  Path,
  Shape,
  TubeGeometry,
  Vector3,
  type Material,
  type Object3D,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const UNIT_BOX = new BoxGeometry(1, 1, 1);
const UNIT_CYL = new CylinderGeometry(1, 1, 1, 24);
const UNIT_CYL_LOW = new CylinderGeometry(1, 1, 1, 10);
// Flat tokens one unit across, their axis along y: the holes of a perforated panel.
const UNIT_HEX = new CylinderGeometry(0.5, 0.5, 1, 6);
const UNIT_TRI = new CylinderGeometry(0.58, 0.58, 1, 3);
const rounded = new Map<string, RoundedBoxGeometry>();
const accentColor = new Color(0xff5a1f);

export { UNIT_BOX };

/**
 * Faces sit a hair behind their true depth, so the lines drawn along their
 * edges always win against the face they belong to.
 */
function setBack(material: MeshStandardMaterial): MeshStandardMaterial {
  material.polygonOffset = true;
  material.polygonOffsetFactor = 1;
  material.polygonOffsetUnits = 2;
  return material;
}

export function mat(color: number, roughness = 0.6, metalness = 0): MeshStandardMaterial {
  return setBack(new MeshStandardMaterial({ color, roughness, metalness }));
}

/** Shared palette. Parts that light up get their own material instead. */
export const M = {
  caseOuter: mat(0x2c2f34, 0.62, 0.35),
  caseInner: mat(0x5b616a, 0.78, 0.2),
  vent: mat(0x191b1e, 0.9, 0.1),
  pcb: mat(0x101215, 0.5, 0.1),
  substrate: mat(0x1d5a3c, 0.55, 0.1),
  heatsink: mat(0x8d939c, 0.4, 0.7),
  heatsinkDark: mat(0x25282d, 0.5, 0.5),
  slot: mat(0x0d0e10, 0.5, 0.05),
  slotAlt: mat(0x3d4147, 0.5, 0.05),
  steel: mat(0xc7cbd1, 0.32, 0.9),
  gold: mat(0xc9a23f, 0.38, 0.85),
  copper: mat(0xb9805a, 0.35, 0.9),
  alu: mat(0xd5d9de, 0.38, 0.75),
  fanFrame: mat(0x23252a, 0.7, 0.05),
  fanBlade: mat(0x40444a, 0.55, 0.05),
  brass: mat(0xb8953f, 0.4, 0.8),
  screw: mat(0xaeb2b8, 0.35, 0.85),
  black: mat(0x17181b, 0.6, 0.1),
  ramBlack: mat(0x1c1d21, 0.45, 0.4),
  ramGrey: mat(0x5a5f66, 0.45, 0.5),
  gpuShroud: mat(0x1d1f23, 0.5, 0.3),
  gpuBack: mat(0x5a5f67, 0.4, 0.65),
  psu: mat(0x1a1b1f, 0.6, 0.3),
  label: mat(0xe9e5db, 0.8, 0),
  labelDim: mat(0x9c9a94, 0.8, 0),
  chip: mat(0x0b0c0d, 0.35, 0.1),
  cable: mat(0x1b1c20, 0.85, 0),
  cableData: mat(0x2d4460, 0.8, 0),
  hose: mat(0x121315, 0.7, 0.05),
  radiator: mat(0x202226, 0.55, 0.4),
};

export type Look = 'drawing' | 'shaded';

/** Fills for the line-drawing look: near-white plates in a few greys, cables the grey of a resting line. */
const DRAWN: Record<keyof typeof M, number> = {
  caseOuter: 0xfcfcfc, caseInner: 0xf4f4f5, vent: 0xe4e4e7, pcb: 0xe7e7ea, substrate: 0xdddde1,
  heatsink: 0xffffff, heatsinkDark: 0xeeeef0, slot: 0xd6d6da, slotAlt: 0xe6e6e9, steel: 0xffffff,
  gold: 0xf3f1ea, copper: 0xf2eee9, alu: 0xffffff, fanFrame: 0xebebee, fanBlade: 0xf7f7f8,
  brass: 0xf1eee5, screw: 0xffffff, black: 0xd2d2d7, ramBlack: 0xdcdce0, ramGrey: 0xeeeef1,
  gpuShroud: 0xe5e5e9, gpuBack: 0xf5f5f7, psu: 0xe2e2e6, label: 0xffffff, labelDim: 0xf8f8f9,
  chip: 0xcbcbd1, cable: 0x9d9da6, cableData: 0xaab1bf, hose: 0x9d9da6, radiator: 0xdedee2,
};

/** The one highlight colour of the drawing look: whatever is lit. */
export const ACCENT = 0xff5a1f;

const SHADED = Object.fromEntries(
  Object.entries(M).map(([key, material]) => [
    key,
    { color: material.color.getHex(), roughness: material.roughness, metalness: material.metalness },
  ]),
) as Record<keyof typeof M, { color: number; roughness: number; metalness: number }>;

/** Materials that light up, with the colour they rest at in the shaded look. */
const glows = new Map<MeshStandardMaterial, number>();
let look: Look = 'shaded';

/** Switches every shared material between flat drawing fills and shaded surfaces. */
export function setLook(next: Look): void {
  look = next;
  for (const key of Object.keys(M) as (keyof typeof M)[]) {
    const material = M[key];
    const shaded = SHADED[key];
    material.color.setHex(next === 'drawing' ? DRAWN[key] : shaded.color);
    material.roughness = next === 'drawing' ? 1 : shaded.roughness;
    material.metalness = next === 'drawing' ? 0 : shaded.metalness;
  }
  for (const material of glows.keys()) setGlow(material, 0);
}

/** Lights a glow material by `amount` (0..1) in whichever way the current look shows light. */
export function setGlow(material: MeshStandardMaterial, amount: number): void {
  const rest = glows.get(material) ?? 0xffffff;
  if (look === 'drawing') {
    material.emissiveIntensity = 0;
    material.color.setHex(0xffffff).lerp(accentColor, Math.min(1, amount));
  } else {
    material.color.setHex(rest);
    material.emissiveIntensity = amount * 1.4;
  }
}

export function box(
  parent: Object3D,
  w: number, h: number, d: number,
  material: Material,
  x = 0, y = 0, z = 0,
): Mesh {
  const mesh = new Mesh(UNIT_BOX, material);
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

export function rbox(
  parent: Object3D,
  w: number, h: number, d: number, r: number,
  material: Material,
  x = 0, y = 0, z = 0,
): Mesh {
  const key = `${w}|${h}|${d}|${r}`;
  let geometry = rounded.get(key);
  if (!geometry) {
    geometry = new RoundedBoxGeometry(w, h, d, 2, r);
    rounded.set(key, geometry);
  }
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

export function cyl(
  parent: Object3D,
  r: number, len: number,
  material: Material,
  axis: 'x' | 'y' | 'z',
  x = 0, y = 0, z = 0,
  low = false,
): Mesh {
  const mesh = new Mesh(low ? UNIT_CYL_LOW : UNIT_CYL, material);
  mesh.scale.set(r, len, r);
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

/** A screw whose axis is z, head resting at the group's origin. */
export function screw(parent: Object3D, x: number, y: number, z: number, r = 3): Group {
  const group = new Group();
  group.position.set(x, y, z);
  cyl(group, r, 2, M.screw, 'z', 0, 0, 1, true);
  cyl(group, r * 0.42, 6, M.screw, 'z', 0, 0, -3, true);
  box(group, r * 1.3, r * 0.3, 0.6, M.black, 0, 0, 2.05);
  parent.add(group);
  return group;
}

const shapes = new Map<string, ExtrudeGeometry>();

/**
 * A flat outline pushed through a thickness, like a part cut from sheet. The
 * outline is in x-y; the solid runs from z = 0 to z = depth. `holes` are cut
 * through it. Geometries are shared between parts that ask for the same shape.
 */
export function prismGeometry(points: [number, number][], depth: number, holes: [number, number][][] = []): ExtrudeGeometry {
  const key = `${depth}|${points.join(';')}|${holes.map((hole) => hole.join(';')).join('/')}`;
  let geometry = shapes.get(key);
  if (!geometry) {
    const shape = new Shape();
    points.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
    shape.closePath();
    for (const hole of holes) {
      const path = new Path();
      hole.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
      path.closePath();
      shape.holes.push(path);
    }
    geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    shapes.set(key, geometry);
  }
  return geometry;
}

export function prism(
  parent: Object3D,
  points: [number, number][], depth: number,
  material: Material,
  x = 0, y = 0, z = 0,
  holes: [number, number][][] = [],
): Mesh {
  const mesh = new Mesh(prismGeometry(points, depth, holes), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

/** Points round a circle, for outlines and holes. */
export function circle(radius: number, segments = 28, cx = 0, cy = 0): [number, number][] {
  return Array.from({ length: segments }, (_, i) => {
    const angle = (i / segments) * Math.PI * 2;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  });
}

/** A square with its corners cut, for plates and frames. */
export function chamfered(w: number, h: number, cut: number): [number, number][] {
  const [x, y] = [w / 2, h / 2];
  return [[-x + cut, -y], [x - cut, -y], [x, -y + cut], [x, y - cut], [x - cut, y], [-x + cut, y], [-x, y - cut], [-x, -y + cut]];
}

/** A flat ring in the x-y plane, z from 0 to depth. */
export function ring(parent: Object3D, outer: number, inner: number, depth: number, material: Material, x = 0, y = 0, z = 0): Mesh {
  // One unit ring per proportion, scaled to size.
  const ratio = Math.round((inner / outer) * 100) / 100;
  const mesh = new Mesh(prismGeometry(circle(1, 32), 1, [circle(ratio, 32).reverse()]), material);
  mesh.scale.set(outer, outer, depth);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

/**
 * Many copies of one box in a single draw: fins, slats, the slits of a mesh
 * panel. `place` positions and sizes copy i through the dummy it is given.
 */
export function copies(
  parent: Object3D,
  count: number,
  material: Material,
  place: (dummy: Node3D, i: number) => void,
  shape: 'box' | 'hex' | 'tri' = 'box',
): InstancedMesh {
  const mesh = new InstancedMesh(shape === 'hex' ? UNIT_HEX : shape === 'tri' ? UNIT_TRI : UNIT_BOX, material, Math.max(1, count));
  mesh.count = count;
  const dummy = new Node3D();
  for (let i = 0; i < count; i++) {
    dummy.position.set(0, 0, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    place(dummy, i);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  parent.add(mesh);
  return mesh;
}

let bladeGeometry: ExtrudeGeometry | undefined;

function blade(): ExtrudeGeometry {
  if (bladeGeometry) return bladeGeometry;
  const at = (r: number, deg: number): [number, number] => [
    r * Math.cos((deg * Math.PI) / 180),
    r * Math.sin((deg * Math.PI) / 180),
  ];
  const shape = new Shape();
  shape.moveTo(...at(0.3, 0));
  shape.quadraticCurveTo(...at(0.68, -4), ...at(0.97, 16));
  for (const deg of [24, 32, 40, 48]) shape.lineTo(...at(0.97, deg));
  shape.quadraticCurveTo(...at(0.7, 46), ...at(0.3, 34));
  shape.closePath();
  bladeGeometry = new ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false, curveSegments: 6 });
  bladeGeometry.translate(0, 0, -0.015);
  return bladeGeometry;
}

export interface Fan {
  group: Group;
  rotor: Group;
}

/**
 * An axial fan lying in the x-y plane, blowing along z: a frame with a round
 * opening and four mounting holes, struts behind, and a hub with swept blades.
 * `round` gives the frame a circular outline, as some 140 mm fans have.
 */
export function fan(parent: Object3D, size: number, thickness: number, blades = 7, round = false): Fan {
  const group = new Group();
  const opening = circle(0.47, 36).reverse() as [number, number][];
  const outlineShape = round ? circle(0.52, 40) : chamfered(1, 1, 0.07);
  const mounts = round ? [] : [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([sx, sy]) => circle(0.022, 10, sx * 0.425, sy * 0.425).reverse() as [number, number][]);
  // Front and back plates of the frame, joined at the corners.
  for (const z of [-thickness / 2, thickness / 2 - thickness * 0.16]) {
    const plate = new Mesh(prismGeometry(outlineShape, 1, [opening, ...mounts]), M.fanFrame);
    plate.scale.set(size, size, thickness * 0.16);
    plate.position.z = z;
    group.add(plate);
  }
  if (!round) {
    for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      cyl(group, size * 0.045, thickness * 0.7, M.fanFrame, 'z', sx * size * 0.425, sy * size * 0.425, 0, true);
    }
  }
  // Stator struts behind the rotor.
  for (let i = 0; i < 4; i++) {
    const strut = box(group, size * 0.3, size * 0.022, 1.6, M.fanFrame, 0, 0, -thickness / 2 + 2);
    strut.rotation.z = Math.PI / 4 + (i * Math.PI) / 2;
    strut.position.set(Math.cos(strut.rotation.z) * size * 0.32, Math.sin(strut.rotation.z) * size * 0.32, -thickness / 2 + 2);
  }
  const rotor = new Group();
  const radius = size * 0.455;
  cyl(rotor, radius * 0.32, thickness * 0.6, M.fanFrame, 'z');
  cyl(rotor, radius * 0.2, 0.6, M.labelDim, 'z', 0, 0, thickness * 0.3 + 0.2);
  for (let i = 0; i < blades; i++) {
    const mesh = new Mesh(blade(), M.fanBlade);
    mesh.scale.setScalar(radius);
    mesh.rotation.z = (i / blades) * Math.PI * 2;
    rotor.add(mesh);
  }
  group.add(rotor);
  parent.add(group);
  return { group, rotor };
}

/** Turns a shape drawn in x-y and pushed along z into one drawn in y-z and pushed along x. */
export const ALONG_X = new Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1);

/** A material that can be lit when the machine is powered. */
export function glowMat(color: number, emissive: number): MeshStandardMaterial {
  const material = setBack(new MeshStandardMaterial({ color, roughness: 0.4, metalness: 0, emissive }));
  glows.set(material, color);
  setGlow(material, 0);
  return material;
}

export function shadows(root: Object3D): void {
  root.traverse((node) => {
    if ((node as Mesh).isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
}

const RADIAL = 8;

/** A cable or hose through the given points. It can be drawn in from its start. */
export function tube(
  parent: Object3D,
  points: [number, number, number][],
  radius: number,
  material: Material,
): Mesh {
  const curve = new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z)), false, 'centripetal');
  const segments = Math.max(14, points.length * 9);
  const mesh = new Mesh(new TubeGeometry(curve, segments, radius, RADIAL, false), material);
  mesh.userData.own = true;
  mesh.userData.noLines = true; // a cable is a dark stroke already
  mesh.userData.segments = segments;
  parent.add(mesh);
  return mesh;
}

/** Shows the first `t` (0..1) of a tube's length. */
export function reveal(mesh: Mesh, t: number): void {
  const segments = mesh.userData.segments as number;
  const shown = Math.round(segments * Math.max(0, Math.min(1, t)));
  mesh.visible = shown > 0;
  mesh.geometry.setDrawRange(0, shown * RADIAL * 6);
}

/** Frees GPU buffers that belong to one model only; shared unit shapes are left alone. */
export function disposeModel(root: Object3D): void {
  root.traverse((node) => {
    if ((node as InstancedMesh).isInstancedMesh) (node as InstancedMesh).dispose();
    else if ((node as Mesh).isMesh && node.userData.own) (node as Mesh).geometry.dispose();
  });
  root.removeFromParent();
}
