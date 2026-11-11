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
  Mesh,
  MeshStandardMaterial,
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
const rounded = new Map<string, RoundedBoxGeometry>();
const accentColor = new Color(0xff5a1f);

export { UNIT_BOX };

/**
 * Makes a material also write its surface normal to a second output. The
 * line-drawing look reads plates and normals from one pass over the scene
 * instead of drawing everything twice; elsewhere the extra output is ignored.
 */
function withNormalOutput(material: MeshStandardMaterial): MeshStandardMaterial {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'layout(location = 1) out highp vec4 gNormal;\nvoid main() {')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n\tgNormal = vec4(normal * 0.5 + 0.5, 1.0);');
  };
  material.customProgramCacheKey = () => 'normal-output';
  return material;
}

export function mat(color: number, roughness = 0.6, metalness = 0): MeshStandardMaterial {
  return withNormalOutput(new MeshStandardMaterial({ color, roughness, metalness }));
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

/** Fills for the line-drawing look: near-white plates in a few greys, dark cables. */
const DRAWN: Record<keyof typeof M, number> = {
  caseOuter: 0xfcfcfc, caseInner: 0xf4f4f5, vent: 0xe4e4e7, pcb: 0xe7e7ea, substrate: 0xdddde1,
  heatsink: 0xffffff, heatsinkDark: 0xeeeef0, slot: 0xd6d6da, slotAlt: 0xe6e6e9, steel: 0xffffff,
  gold: 0xf3f1ea, copper: 0xf2eee9, alu: 0xffffff, fanFrame: 0xebebee, fanBlade: 0xf7f7f8,
  brass: 0xf1eee5, screw: 0xffffff, black: 0xd2d2d7, ramBlack: 0xdcdce0, ramGrey: 0xeeeef1,
  gpuShroud: 0xe5e5e9, gpuBack: 0xf5f5f7, psu: 0xe2e2e6, label: 0xffffff, labelDim: 0xf8f8f9,
  chip: 0xcbcbd1, cable: 0x3f3f46, cableData: 0x5b6474, hose: 0x3f3f46, radiator: 0xdedee2,
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

let bladeGeometry: ExtrudeGeometry | undefined;

function blade(): ExtrudeGeometry {
  if (bladeGeometry) return bladeGeometry;
  const at = (r: number, deg: number): [number, number] => [
    r * Math.cos((deg * Math.PI) / 180),
    r * Math.sin((deg * Math.PI) / 180),
  ];
  const shape = new Shape();
  shape.moveTo(...at(0.28, 0));
  shape.quadraticCurveTo(...at(0.7, 0), ...at(0.98, 20));
  for (const deg of [28, 36, 44, 52]) shape.lineTo(...at(0.98, deg));
  shape.quadraticCurveTo(...at(0.7, 50), ...at(0.28, 36));
  shape.closePath();
  bladeGeometry = new ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false, curveSegments: 6 });
  bladeGeometry.translate(0, 0, -0.015);
  return bladeGeometry;
}

export interface Fan {
  group: Group;
  rotor: Group;
}

/** A square-framed axial fan lying in the x-y plane, blowing along z. */
export function fan(parent: Object3D, size: number, thickness: number, blades = 7): Fan {
  const group = new Group();
  const bar = size * 0.055;
  const half = size / 2 - bar / 2;
  box(group, size, bar, thickness, M.fanFrame, 0, half, 0);
  box(group, size, bar, thickness, M.fanFrame, 0, -half, 0);
  box(group, bar, size, thickness, M.fanFrame, half, 0, 0);
  box(group, bar, size, thickness, M.fanFrame, -half, 0, 0);
  // Corner webs fill the space between the square frame and the round opening.
  const web = size * 0.2;
  const inset = size / 2 - web * 0.42;
  for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const corner = box(group, web, web, thickness, M.fanFrame, sx * inset, sy * inset, 0);
    corner.rotation.z = Math.PI / 4;
  }
  // Stator struts behind the rotor.
  for (const angle of [Math.PI / 4, -Math.PI / 4]) {
    const strut = box(group, size * 0.98, size * 0.022, 1.6, M.fanFrame, 0, 0, -thickness / 2 + 1.2);
    strut.rotation.z = angle;
  }
  const rotor = new Group();
  const radius = size * 0.455;
  cyl(rotor, radius * 0.33, thickness * 0.62, M.fanFrame, 'z');
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

/** A material that can be lit when the machine is powered. */
export function glowMat(color: number, emissive: number): MeshStandardMaterial {
  const material = withNormalOutput(new MeshStandardMaterial({ color, roughness: 0.4, metalness: 0, emissive }));
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
