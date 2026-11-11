// The lines of the drawing look. Every edge of every shape is real geometry:
// a thin screen-facing strip that is always the same width on screen and is
// antialiased, so lines stay put and stay smooth while the view turns.
//
// An edge knows the two faces it joins. From the camera that makes it one of:
//   an outline  - one face toward the viewer, one away: drawn dark;
//   a crease    - both toward the viewer and meeting at an angle: drawn light;
//   hidden      - both away, or a smooth join that is not on the outline.
// The choice is made per frame in the vertex shader, so curved things such as
// fan hubs and rounded corners get an outline wherever it falls.

import {
  Box3,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Matrix3,
  Matrix4,
  Mesh,
  ShaderMaterial,
  Sphere,
  Vector2,
  Vector3,
  type InstancedMesh,
  type Object3D,
} from 'three';

/** Faces meeting at more than this are a crease; flatter joins show only on the outline. */
const CREASE_DEGREES = 28;

interface EdgeList {
  a: number[];
  b: number[];
  n1: number[];
  n2: number[];
  crease: number[];
}

const lists = new WeakMap<BufferGeometry, EdgeList>();
const built = new WeakMap<BufferGeometry, InstancedBufferGeometry>();

/** Finds each edge of a mesh and the normals of the faces on either side of it. */
function edgesOf(geometry: BufferGeometry): EdgeList {
  const known = lists.get(geometry);
  if (known) return known;

  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const corners = index ? index.count : position.count;

  // Vertices at the same place are one vertex, however the mesh splits them.
  const ids = new Map<string, number>();
  const points: Vector3[] = [];
  const welded = new Int32Array(position.count);
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const key = `${Math.round(x * 2000)},${Math.round(y * 2000)},${Math.round(z * 2000)}`;
    let id = ids.get(key);
    if (id === undefined) {
      id = points.length;
      ids.set(key, id);
      points.push(new Vector3(x, y, z));
    }
    welded[i] = id;
  }

  const faces = new Map<number, Vector3[]>();
  const ends = new Map<number, [number, number]>();
  const ab = new Vector3();
  const ac = new Vector3();
  for (let corner = 0; corner + 2 < corners; corner += 3) {
    const tri = [0, 1, 2].map((k) => welded[index ? index.getX(corner + k) : corner + k]);
    if (tri[0] === tri[1] || tri[1] === tri[2] || tri[0] === tri[2]) continue;
    const normal = new Vector3().crossVectors(
      ab.subVectors(points[tri[1]], points[tri[0]]),
      ac.subVectors(points[tri[2]], points[tri[0]]),
    );
    if (normal.lengthSq() < 1e-16) continue;
    normal.normalize();
    for (let k = 0; k < 3; k++) {
      const lo = Math.min(tri[k], tri[(k + 1) % 3]);
      const hi = Math.max(tri[k], tri[(k + 1) % 3]);
      const key = lo * points.length + hi;
      const list = faces.get(key);
      if (list) list.push(normal);
      else {
        faces.set(key, [normal]);
        ends.set(key, [lo, hi]);
      }
    }
  }

  const list: EdgeList = { a: [], b: [], n1: [], n2: [], crease: [] };
  const sharp = Math.cos((CREASE_DEGREES * Math.PI) / 180);
  for (const [key, normals] of faces) {
    const first = normals[0];
    // An edge with one face is the rim of an open surface: always an outline.
    const second = normals[1] ?? first.clone().negate();
    const cosine = first.dot(second);
    if (cosine > 0.9999) continue; // the diagonal of a flat face
    const [lo, hi] = ends.get(key)!;
    list.a.push(points[lo].x, points[lo].y, points[lo].z);
    list.b.push(points[hi].x, points[hi].y, points[hi].z);
    list.n1.push(first.x, first.y, first.z);
    list.n2.push(second.x, second.y, second.z);
    list.crease.push(cosine < sharp ? 1 : 0);
  }
  lists.set(geometry, list);
  return list;
}

function stripsFor(list: EdgeList): InstancedBufferGeometry {
  const geometry = new InstancedBufferGeometry();
  // One strip: x runs along the edge (0..1), y across it (-1..1).
  geometry.setAttribute('position', new Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0], 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.setAttribute('edgeA', new InstancedBufferAttribute(new Float32Array(list.a), 3));
  geometry.setAttribute('edgeB', new InstancedBufferAttribute(new Float32Array(list.b), 3));
  geometry.setAttribute('faceA', new InstancedBufferAttribute(new Float32Array(list.n1), 3));
  geometry.setAttribute('faceB', new InstancedBufferAttribute(new Float32Array(list.n2), 3));
  geometry.setAttribute('crease', new InstancedBufferAttribute(new Float32Array(list.crease), 1));
  geometry.instanceCount = list.crease.length;
  // Its size is that of the edges, not of the unit strip they are drawn with.
  const bounds = new Box3();
  const point = new Vector3();
  for (const ends of [list.a, list.b]) {
    for (let i = 0; i < ends.length; i += 3) bounds.expandByPoint(point.fromArray(ends, i));
  }
  geometry.boundingBox = bounds;
  geometry.boundingSphere = bounds.getBoundingSphere(new Sphere());
  return geometry;
}

const VERTEX = /* glsl */ `
attribute vec3 edgeA;
attribute vec3 edgeB;
attribute vec3 faceA;
attribute vec3 faceB;
attribute float crease;
uniform vec2 resolution;
uniform float scale;
uniform float emphasis;
varying float vAcross;
varying float vHalf;
varying float vOutline;

void main() {
  vec4 a = projectionMatrix * modelViewMatrix * vec4(edgeA, 1.0);
  vec4 b = projectionMatrix * modelViewMatrix * vec4(edgeB, 1.0);

  // In view space the camera looks down -z, so a face is toward it when its normal has +z.
  bool frontA = (normalMatrix * faceA).z > 0.0;
  bool frontB = (normalMatrix * faceB).z > 0.0;
  bool outline = frontA != frontB;
  bool shown = outline || (crease > 0.5 && frontA && frontB);

  // A little heavier when the part is picked out, as a pen would press harder.
  float halfWidth = 0.5 * scale * (outline ? mix(1.0, 1.3, emphasis) : mix(0.8, 0.9, emphasis));
  float reach = halfWidth + 1.0;
  vec2 pa = a.xy / a.w * resolution * 0.5;
  vec2 pb = b.xy / b.w * resolution * 0.5;
  vec2 along = pb - pa;
  float len = max(length(along), 1e-5);
  along /= len;
  vec2 across = vec2(-along.y, along.x);

  // Widen the strip across the edge, and run it a little past each end so joins close.
  vec4 clip = mix(a, b, position.x);
  vec2 offset = across * position.y * reach + along * (position.x * 2.0 - 1.0) * halfWidth;
  clip.xy += offset / resolution * 2.0 * clip.w;
  clip.z -= 0.00012 * clip.w;

  gl_Position = shown ? clip : vec4(2.0, 2.0, 2.0, 1.0);
  vAcross = position.y * reach;
  vHalf = halfWidth;
  vOutline = outline ? 1.0 : 0.0;
}`;

const FRAGMENT = /* glsl */ `
uniform vec3 outlineRest;
uniform vec3 creaseRest;
uniform vec3 outlineLit;
uniform vec3 creaseLit;
uniform float emphasis;
varying float vAcross;
varying float vHalf;
varying float vOutline;

void main() {
  float alpha = 1.0 - smoothstep(vHalf - 0.5, vHalf + 0.5, abs(vAcross));
  if (alpha < 0.02) discard;
  vec3 rest = mix(creaseRest, outlineRest, vOutline);
  vec3 lit = mix(creaseLit, outlineLit, vOutline);
  gl_FragColor = vec4(mix(rest, lit, emphasis), alpha);
  #include <colorspace_fragment>
}`;

// Shared by every line material: the picture's size and the line colours.
// At rest a drawing is light; what the pointer picks out goes dark.
const shared = {
  resolution: { value: new Vector2(1, 1) },
  scale: { value: 1 },
  outlineRest: { value: new Color(0xa3a3ab) },
  creaseRest: { value: new Color(0xd3d3d9) },
  outlineLit: { value: new Color(0x0a0a0a) },
  creaseLit: { value: new Color(0x63636b) },
};
const materials = new Set<ShaderMaterial>();
let linesVisible = true;

/**
 * A material for one thing's lines (a part, a cable, the case), so that thing
 * can be picked out on its own. `uniforms.emphasis` runs from 0 (resting) to 1.
 */
export function lineMaterial(): ShaderMaterial {
  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: DoubleSide,
    // Blended, not cut out: each line fades over its last pixel, which is what
    // keeps it smooth at any angle. Lines are drawn after the faces and leave
    // depth alone, so a face in front still hides them.
    transparent: true,
    depthWrite: false,
    uniforms: { ...shared, emphasis: { value: 0 } },
  });
  material.visible = linesVisible;
  materials.add(material);
  return material;
}

export function releaseLineMaterial(material: ShaderMaterial): void {
  materials.delete(material);
  material.dispose();
}

/** Tells the lines how big the picture is, and how many device pixels make one line-width unit. */
export function setEdgeView(width: number, height: number, scale: number): void {
  shared.resolution.value.set(width, height);
  shared.scale.value = scale;
}

export function setEdgesVisible(visible: boolean): void {
  linesVisible = visible;
  for (const material of materials) material.visible = visible;
}

function addLines(parent: Mesh, geometry: InstancedBufferGeometry, own: boolean, material: ShaderMaterial): void {
  const lines = new Mesh(geometry, material);
  lines.raycast = () => {}; // the pointer picks shapes, never their lines
  lines.userData.lines = true;
  lines.userData.own = own;
  lines.frustumCulled = false;
  lines.castShadow = false;
  lines.receiveShadow = false;
  parent.add(lines);
}

/** Every copy of an instanced shape, with its edges moved to where that copy sits. */
function instancedEdges(mesh: InstancedMesh): EdgeList {
  const base = edgesOf(mesh.geometry);
  const list: EdgeList = { a: [], b: [], n1: [], n2: [], crease: [] };
  const matrix = new Matrix4();
  const normalMatrix = new Matrix3();
  const point = new Vector3();
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, matrix);
    normalMatrix.getNormalMatrix(matrix);
    for (let e = 0; e < base.crease.length; e++) {
      for (const [from, to, direction] of [
        [base.a, list.a, false], [base.b, list.b, false], [base.n1, list.n1, true], [base.n2, list.n2, true],
      ] as [number[], number[], boolean][]) {
        point.fromArray(from, e * 3);
        if (direction) point.applyMatrix3(normalMatrix).normalize();
        else point.applyMatrix4(matrix);
        to.push(point.x, point.y, point.z);
      }
      list.crease.push(base.crease[e]);
    }
  }
  return list;
}

/** Gives every shape under `root` its lines. Shapes marked `noLines` (cables) are left plain. */
export function outline(root: Object3D, material: ShaderMaterial): void {
  const meshes: Mesh[] = [];
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (mesh.isMesh && !mesh.userData.lines && !mesh.userData.noLines && !mesh.userData.outlined) meshes.push(mesh);
  });
  for (const mesh of meshes) {
    mesh.userData.outlined = true;
    if ((mesh as InstancedMesh).isInstancedMesh) {
      addLines(mesh, stripsFor(instancedEdges(mesh as InstancedMesh)), true, material);
      continue;
    }
    let strips = built.get(mesh.geometry);
    if (!strips) {
      strips = stripsFor(edgesOf(mesh.geometry));
      built.set(mesh.geometry, strips);
    }
    // Shapes that share a geometry share its lines; a one-off shape owns its own.
    addLines(mesh, strips, false, material);
  }
}
