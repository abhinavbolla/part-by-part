// The line-drawing look. The scene is rendered once off-screen into two
// pictures at the same time, flat plates (with depth) and surface normals,
// and a final pass draws a line wherever either one breaks: a dark line where depth jumps (an outline)
// and a lighter one where a surface turns (a crease). Because the lines come
// from the picture rather than from each shape, every part is outlined the
// same way whatever it is made of.

import {
  Color,
  DepthTexture,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  type Camera,
  type WebGLRenderer,
} from 'three';

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const FRAGMENT = /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform sampler2D tNormal;
uniform vec2 texel;
uniform float range;
uniform float jump;
uniform vec3 outline;
uniform vec3 crease;
uniform float creaseStrength;
varying vec2 vUv;

float depthAt(vec2 uv) { return texture2D(tDepth, uv).x * range; }
vec3 normalAt(vec2 uv) { return texture2D(tNormal, uv).xyz * 2.0 - 1.0; }

void main() {
  vec2 dx = vec2(texel.x, 0.0);
  vec2 dy = vec2(0.0, texel.y);

  // Second difference of depth: zero across any flat surface however it is
  // tilted, large where one thing ends in front of another.
  float c = depthAt(vUv);
  float bend = abs(depthAt(vUv - dx) + depthAt(vUv + dx) - 2.0 * c)
             + abs(depthAt(vUv - dy) + depthAt(vUv + dy) - 2.0 * c);
  float edge = smoothstep(jump, jump * 2.2, bend);

  vec3 n = normalAt(vUv);
  float turn = max(
    max(distance(n, normalAt(vUv - dx)), distance(n, normalAt(vUv + dx))),
    max(distance(n, normalAt(vUv - dy)), distance(n, normalAt(vUv + dy))));
  float fold = smoothstep(0.22, 0.55, turn) * (1.0 - edge);

  vec3 color = texture2D(tColor, vUv).rgb;
  color = mix(color, crease, fold * creaseStrength);
  color = mix(color, outline, edge);
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`;

export interface Drawing {
  setSize(width: number, height: number): void;
  /**
   * `pixel` is the size of one device pixel in scene units (millimetres).
   * The picture goes to the screen, or to `output` when one is given.
   */
  render(scene: Scene, camera: Camera, depthRange: number, pixel: number, output?: WebGLRenderTarget | null): void;
}

export function createDrawing(renderer: WebGLRenderer, background: number): Drawing {
  const depth = new DepthTexture(1, 1);
  // Two colour outputs: [0] the plates, [1] the normals each material writes.
  const sheet = new WebGLRenderTarget(1, 1, { depthTexture: depth, count: 2 });
  const paper = new Color(background);

  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      tColor: { value: sheet.textures[0] },
      tDepth: { value: depth },
      tNormal: { value: sheet.textures[1] },
      texel: { value: new Vector2(1, 1) },
      range: { value: 1 },
      jump: { value: 1.5 },
      outline: { value: new Color(0x26262b) },
      crease: { value: new Color(0x8e8e96) },
      creaseStrength: { value: 0.85 },
    },
  });
  const quadScene = new Scene();
  quadScene.add(new Mesh(new PlaneGeometry(2, 2), material));
  const quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  return {
    setSize(width, height) {
      sheet.setSize(width, height);
      material.uniforms.texel.value.set(1 / width, 1 / height);
    },
    render(scene, camera, depthRange, pixel, output = null) {
      material.uniforms.range.value = depthRange;
      // A step smaller than a couple of pixels deep is a crease, not an outline.
      material.uniforms.jump.value = Math.max(1.3, pixel * 2.6);

      renderer.setRenderTarget(sheet);
      renderer.setClearColor(paper, 1);
      renderer.render(scene, camera);

      renderer.setRenderTarget(output);
      renderer.setClearColor(paper, 1);
      renderer.render(quadScene, quadCamera);
      renderer.setRenderTarget(null);
    },
  };
}
