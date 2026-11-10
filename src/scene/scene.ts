// The 3D view. It renders only when something changes: an animation, a drag,
// a camera move or the powered-on machine. Idle, it costs nothing.

import {
  Box3,
  BoxGeometry,
  Color,
  DirectionalLight,
  EdgesGeometry,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  PMREMGenerator,
  Raycaster,
  Scene,
  ShadowMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import type { BuildStore, Change } from '../build/store.ts';
import type { Part } from '../catalog/types.ts';
import { HOVER, clamp01, easeOut, seg } from './anim.ts';
import { shadows } from './kit.ts';
import { caseLayout } from './layout.ts';
import { buildBoard, type BoardModel } from './models/board.ts';
import { buildCase } from './models/case.ts';
import {
  buildCooler,
  buildCpu,
  buildGpu,
  buildPsu,
  buildRam,
  buildStorage,
} from './models/components.ts';
import type { Fixtures, PartModel } from './models/types.ts';

export interface Insets {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface SceneStats {
  /** Frame intervals in ms for recent animated frames. */
  frames: number[];
  /** Last input-to-rendered-frame delay in ms. */
  inputLatency: number | null;
  drawCalls: number;
  triangles: number;
  settled: boolean;
  /** Frames rendered since load; stays put while nothing is happening. */
  rendered: number;
}

export type DropResult = 'drop' | 'reject' | 'cancel';

/** A part outside the timeline: leaving, being offered, or bouncing off. */
interface Loose {
  p: number;
  target: number;
  drive: boolean;
  /** Seconds of "does not fit" shake still to play once it reaches target. */
  shake: number;
  /** 1..0 shrink-out in place, used when a drag is dropped in mid-air. */
  fade?: number;
  /** Waiting at target for the store to take it over. */
  hold?: boolean;
}

const BG = 0xf3f1ec;
const SNAP_PX = 120;
const SHAKE = 0.42;

export function createScene(canvas: HTMLCanvasElement, store: BuildStore, insets: () => Insets) {
  const lay = caseLayout(store.pcCase);

  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;

  const scene = new Scene();
  scene.background = new Color(BG);
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;
  pmrem.dispose();

  scene.add(new HemisphereLight(0xffffff, 0xcfc8ba, 0.75));
  const sun = new DirectionalLight(0xffffff, 3.1);
  sun.position.set(330, 820, 760);
  sun.target.position.set(0, 200, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -480;
  sun.shadow.camera.right = 480;
  sun.shadow.camera.top = 480;
  sun.shadow.camera.bottom = -480;
  sun.shadow.camera.near = 200;
  sun.shadow.camera.far = 2200;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.8;
  scene.add(sun, sun.target);

  const ground = new Mesh(new PlaneGeometry(6000, 6000), new ShadowMaterial({ opacity: 0.26 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const caseModel = buildCase(store.pcCase, lay);
  shadows(caseModel.group);
  scene.add(caseModel.group);
  const boardFrame = new Group();
  boardFrame.position.set(lay.board.x, lay.board.y, lay.board.z);
  caseModel.group.add(boardFrame);

  // ---- part models ---------------------------------------------------------

  const models = new Map<string, PartModel>();
  const lastP = new Map<string, number>();
  const ghostBoxes = new Map<string, Box3[]>();
  const centers = new Map<string, Vector3>();
  const loose = new Map<string, Loose>();

  const currentBoard = (): BoardModel | undefined => {
    const part = store.steps.find((step) => step.category === 'motherboard');
    return part ? (models.get(part.id) as BoardModel | undefined) : undefined;
  };
  const fixtures: Fixtures = {
    socket: (open) => currentBoard()?.socket(open),
    dimm: (open) => currentBoard()?.dimm(open),
    latch: (open) => currentBoard()?.latch(open),
  };

  function build(part: Part): PartModel {
    switch (part.category) {
      case 'motherboard': return buildBoard(part, lay);
      case 'cpu': return buildCpu(part, fixtures);
      case 'cooler': return buildCooler(part);
      case 'ram': return buildRam(part, fixtures);
      case 'storage': return buildStorage(part);
      case 'gpu': return buildGpu(part, fixtures);
      case 'psu': return buildPsu(part, lay);
    }
  }

  function ensure(part: Part): PartModel {
    let model = models.get(part.id);
    if (model) return model;
    model = build(part);
    shadows(model.group);
    (model.frame === 'board' ? boardFrame : caseModel.group).add(model.group);
    models.set(part.id, model);

    // Measure where it ends up (for the drop target) and where it hovers.
    model.group.visible = true;
    model.setProgress(1, false);
    caseModel.group.updateMatrixWorld(true);
    ghostBoxes.set(part.id, (model.ghostTargets ?? [model.group]).map((target) =>
      new Box3().setFromObject(target).expandByScalar(1.5)));
    model.setProgress(HOVER, false);
    caseModel.group.updateMatrixWorld(true);
    centers.set(part.id, new Box3().setFromObject(model.group).getCenter(new Vector3()));
    model.setProgress(0, false);
    model.group.visible = false;
    lastP.set(part.id, 0);
    return model;
  }

  function pose(id: string, p: number, drive: boolean, force = false): void {
    if (!force && lastP.get(id) === p) return;
    const model = models.get(id);
    if (!model) return;
    lastP.set(id, p);
    model.group.visible = p > 0.0005;
    model.setProgress(p, drive);
    model.group.scale.setScalar(0.55 + 0.45 * easeOut(seg(p, 0, 0.1)));
  }

  // ---- drop-target ghost ---------------------------------------------------

  const ghost = new Group();
  scene.add(ghost);
  const unitBox = new BoxGeometry(1, 1, 1);
  const unitEdges = new EdgesGeometry(unitBox);
  const ghostFill = {
    ok: new MeshBasicMaterial({ color: 0x1f9d55, transparent: true, opacity: 0.16, depthWrite: false }),
    bad: new MeshBasicMaterial({ color: 0xd6452f, transparent: true, opacity: 0.16, depthWrite: false }),
  };
  const ghostLine = {
    ok: new LineBasicMaterial({ color: 0x1f9d55, transparent: true, opacity: 0.9, depthTest: false }),
    bad: new LineBasicMaterial({ color: 0xd6452f, transparent: true, opacity: 0.9, depthTest: false }),
  };
  let ghostPart: Part | null = null;

  function showGhost(part: Part | null, blocked = false): void {
    ghost.clear();
    ghostPart = part;
    if (part) {
      ensure(part);
      const kind = blocked ? 'bad' : 'ok';
      for (const bounds of ghostBoxes.get(part.id) ?? []) {
        const size = bounds.getSize(new Vector3());
        const center = bounds.getCenter(new Vector3());
        const fill = new Mesh(unitBox, ghostFill[kind]);
        const line = new LineSegments(unitEdges, ghostLine[kind]);
        line.renderOrder = 10;
        for (const item of [fill, line]) {
          item.scale.copy(size);
          item.position.copy(center);
          ghost.add(item);
        }
      }
    }
    setGhostStrength(false);
    invalidate();
  }

  function setGhostStrength(strong: boolean): void {
    ghostFill.ok.opacity = ghostFill.bad.opacity = strong ? 0.34 : 0.16;
  }

  // ---- camera --------------------------------------------------------------

  const camera = new PerspectiveCamera(30, 1, 50, 8000);
  const center = new Vector3(0, lay.H * 0.48, 0);
  const view = { az: 0.46, el: 0.26, zoom: 1 };
  const viewTarget = { ...view };
  let fitDistance = 1400;
  let width = 1;
  let height = 1;

  function resize(): void {
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    const inset = insets();
    const freeW = Math.max(240, width - inset.left - inset.right);
    const freeH = Math.max(240, height - inset.top - inset.bottom);
    camera.aspect = width / height;
    camera.setViewOffset(
      width, height,
      (inset.right - inset.left) / 2, (inset.bottom - inset.top) / 2,
      width, height,
    );
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    const objectH = lay.H * 1.22;
    const objectW = (lay.L + lay.W * 0.5) * 1.16;
    fitDistance = Math.max(
      objectH / 2 / (tan * (freeH / height)),
      objectW / 2 / (tan * (freeW / height)),
    );
    camera.updateProjectionMatrix();
    invalidate();
  }

  function placeCamera(): void {
    const distance = fitDistance * view.zoom;
    const cosEl = Math.cos(view.el);
    camera.position.set(
      center.x + distance * Math.sin(view.az) * cosEl,
      center.y + distance * Math.sin(view.el),
      center.z + distance * Math.cos(view.az) * cosEl,
    );
    camera.lookAt(center);
    camera.updateMatrixWorld();
  }

  function orbit(dx: number, dy: number): void {
    viewTarget.az = Math.max(-1.25, Math.min(1.25, viewTarget.az - dx * 0.006));
    viewTarget.el = Math.max(0.03, Math.min(1.1, viewTarget.el + dy * 0.005));
    invalidate();
  }

  function zoomBy(delta: number): void {
    viewTarget.zoom = Math.max(0.5, Math.min(1.7, viewTarget.zoom * Math.exp(delta * 0.0012)));
    invalidate();
  }

  // ---- timeline ------------------------------------------------------------

  /** Visual cursor: part i is at progress clamp(s - i). Chases store.cursor. */
  let s = 0;
  let scrubbing = false;
  let lastReported = -1;
  let onProgress: ((value: number) => void) | null = null;

  function reconcile(): void {
    const inSteps = new Set(store.steps.map((part) => part.id));
    for (const [id, p] of lastP) {
      if (p > 0 && !inSteps.has(id) && !loose.has(id) && visitor?.part.id !== id) {
        loose.set(id, { p, target: 0, drive: true, shake: 0 });
      }
    }
  }

  function onStoreChange(change: Change): void {
    setPower(false);
    if (change.kind === 'install' && change.part && change.index !== undefined) {
      ensure(change.part);
      const start = loose.get(change.part.id)?.p ?? 0;
      loose.delete(change.part.id);
      s = change.index + start; // anything still seating before it finishes at once
    } else if (change.kind === 'remove' && change.part && change.index !== undefined) {
      const p = clamp01(s - change.index);
      if (s > change.index) s = Math.max(change.index, s - 1);
      if (p > 0) loose.set(change.part.id, { p, target: 0, drive: true, shake: 0 });
    }
    reconcile();
    invalidate();
  }
  store.subscribe(onStoreChange);

  function scrub(value: number): void {
    scrubbing = true;
    setPower(false);
    s = Math.max(0, Math.min(store.steps.length, value));
    invalidate();
  }

  function scrubEnd(): number {
    scrubbing = false;
    invalidate();
    return s;
  }

  // ---- offering a part: drag, drop, reject ---------------------------------

  interface Visitor {
    part: Part;
    model: PartModel;
    blocked: boolean;
    snapped: boolean;
    hoverLocal: Vector3;
    centerWorld: Vector3;
  }
  let visitor: Visitor | null = null;
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const dragPlane = new Plane();
  const hit = new Vector3();
  const projected = new Vector3();

  function dragStart(part: Part, blocked: boolean): void {
    const model = ensure(part);
    loose.delete(part.id);
    pose(part.id, HOVER, false, true);
    visitor = {
      part,
      model,
      blocked,
      snapped: false,
      hoverLocal: model.group.position.clone(),
      centerWorld: centers.get(part.id)!.clone(),
    };
    model.group.visible = false;
    showGhost(part, blocked);
  }

  /** Moves the held part under the pointer. Returns true while it is snapped to its slot. */
  function dragMove(clientX: number, clientY: number): boolean {
    if (!visitor) return false;
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    dragPlane.setFromNormalAndCoplanarPoint(new Vector3(0, 0, 1), visitor.centerWorld);
    const group = visitor.model.group;
    if (!raycaster.ray.intersectPlane(dragPlane, hit)) return visitor.snapped;

    projected.copy(visitor.centerWorld).project(camera);
    const px = ((projected.x + 1) / 2) * rect.width + rect.left;
    const py = ((1 - projected.y) / 2) * rect.height + rect.top;
    const snapped = Math.hypot(clientX - px, clientY - py) < SNAP_PX;

    group.visible = true;
    group.scale.setScalar(1);
    if (snapped) group.position.copy(visitor.hoverLocal);
    else group.position.copy(visitor.hoverLocal).add(hit).sub(visitor.centerWorld);
    if (snapped !== visitor.snapped) {
      visitor.snapped = snapped;
      setGhostStrength(snapped);
    }
    invalidate();
    return snapped;
  }

  function dragEnd(): DropResult {
    const held = visitor;
    visitor = null;
    showGhost(null);
    if (!held) return 'cancel';
    const id = held.part.id;
    lastP.set(id, HOVER);
    if (!held.model.group.visible) {
      lastP.set(id, 0);
      return 'cancel';
    }
    if (!held.snapped) {
      loose.set(id, { p: HOVER, target: HOVER, drive: false, shake: 0, fade: 1 });
      return 'cancel';
    }
    if (held.blocked) {
      loose.set(id, { p: HOVER, target: HOVER, drive: false, shake: SHAKE });
      return 'reject';
    }
    loose.set(id, { p: HOVER, target: HOVER, drive: true, shake: 0, hold: true });
    return 'drop';
  }

  /** A blocked part comes up to its slot, shakes, and goes away again. */
  function bounce(part: Part): void {
    ensure(part);
    if (store.steps.some((step) => step.id === part.id)) return;
    const from = loose.get(part.id)?.p ?? 0;
    loose.set(part.id, { p: from, target: HOVER, drive: false, shake: SHAKE });
    showGhost(part, true);
    invalidate();
  }

  // ---- power ---------------------------------------------------------------

  let powered = false;
  let power = 0;

  function setPower(on: boolean): void {
    if (powered === on) return;
    powered = on;
    invalidate();
  }

  function applyPower(dt: number): boolean {
    const goal = powered ? 1 : 0;
    if (power === goal && goal === 0) return false;
    power = goal > power ? Math.min(goal, power + dt / 1.6) : Math.max(goal, power - dt / 0.7);
    const seated = new Set(store.installed.map((part) => part.id));
    const spin = dt * 15 * power;
    for (const rotor of caseModel.rotors) rotor.rotation.z += spin;
    for (const material of caseModel.glow) material.emissiveIntensity = power * 1.6;
    for (const [id, model] of models) {
      const on = seated.has(id) ? power : 0;
      for (const material of model.glow) material.emissiveIntensity = on * 1.2;
      if (on > 0) for (const rotor of model.rotors) rotor.rotation.z += spin * 1.25;
    }
    return true;
  }

  // ---- frame loop ----------------------------------------------------------

  let raf = 0;
  let lastTime = 0;
  let pendingInput: number | null = null;
  let firstFrame = true;
  const stats: SceneStats = { frames: [], inputLatency: null, drawCalls: 0, triangles: 0, settled: true, rendered: 0 };

  function invalidate(): void {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function stepLoose(dt: number): boolean {
    let active = false;
    for (const [id, item] of loose) {
      const model = models.get(id);
      if (!model) { loose.delete(id); continue; }
      if (item.fade !== undefined) {
        item.fade -= dt / 0.16;
        if (item.fade <= 0) {
          model.group.visible = false;
          lastP.set(id, 0);
          loose.delete(id);
        } else {
          model.group.scale.setScalar(item.fade);
          active = true;
        }
        continue;
      }
      if (item.p !== item.target) {
        const rate = (item.target > item.p ? 1.25 : 2.3) / model.duration;
        item.p = item.target > item.p
          ? Math.min(item.target, item.p + rate * dt)
          : Math.max(item.target, item.p - rate * dt);
        active = true;
      }
      pose(id, item.p, item.drive, true);
      if (item.p !== item.target) continue;
      if (item.shake > 0) {
        item.shake -= dt;
        const k = Math.max(0, item.shake / SHAKE);
        model.group.position.x += Math.sin((1 - k) * Math.PI * 7) * 6 * k;
        if (item.shake <= 0) {
          item.target = 0;
          if (ghostPart?.id === id && !visitor) showGhost(null);
        }
        active = true;
      } else if (item.target === 0) {
        loose.delete(id);
      } else if (!item.hold) {
        item.target = 0;
        active = true;
      }
    }
    return active;
  }

  function frame(now: number): void {
    raf = 0;
    const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 1 / 60;
    let active = false;

    const target = scrubbing ? s : store.cursor;
    if (s !== target) {
      const forward = s < target;
      const index = Math.max(0, Math.min(store.steps.length - 1, forward ? Math.floor(s) : Math.ceil(s) - 1));
      const duration = models.get(store.steps[index]?.id)?.duration ?? 2;
      const rate = (forward ? 1 : 2) / duration;
      s = forward ? Math.min(target, s + rate * dt) : Math.max(target, s - rate * dt);
      active = true;
    }
    store.steps.forEach((part, i) => {
      ensure(part);
      pose(part.id, clamp01(s - i), true);
    });
    if (s !== lastReported) {
      lastReported = s;
      onProgress?.(s);
    }
    if (stepLoose(dt)) active = true;
    if (applyPower(dt)) active = true;

    const ease = 1 - Math.exp(-dt * 14);
    for (const key of ['az', 'el', 'zoom'] as const) {
      const delta = viewTarget[key] - view[key];
      if (Math.abs(delta) > 0.0004) {
        view[key] += delta * ease;
        active = true;
      } else {
        view[key] = viewTarget[key];
      }
    }
    placeCamera();

    renderer.render(scene, camera);

    stats.rendered++;
    stats.drawCalls = renderer.info.render.calls;
    stats.triangles = renderer.info.render.triangles;
    stats.settled = !active && !visitor;
    if (lastTime && active) {
      stats.frames.push(now - lastTime);
      if (stats.frames.length > 900) stats.frames.shift();
    }
    if (pendingInput !== null) {
      stats.inputLatency = performance.now() - pendingInput;
      pendingInput = null;
    }
    if (firstFrame) {
      firstFrame = false;
      performance.mark('scene-first-frame');
    }
    lastTime = active ? now : 0;
    if (active) invalidate();
  }

  /**
   * Builds every part and draws it once while the page is idle, so shaders are
   * compiled and geometry is uploaded before the first click needs them.
   */
  function warm(parts: Part[], done?: () => void): void {
    const queue = [...parts];
    const whenIdle = (task: () => void): void => {
      if ('requestIdleCallback' in window) window.requestIdleCallback(task, { timeout: 600 });
      else setTimeout(task, 60);
    };
    const step = (): void => {
      const part = queue.shift();
      if (part) {
        ensure(part);
        whenIdle(step);
        return;
      }
      const hidden = [...models].filter(([, model]) => !model.group.visible);
      for (const [, model] of hidden) {
        model.setProgress(1, false);
        model.group.scale.setScalar(1);
        model.group.visible = true;
      }
      // The drop-target outline uses its own shaders; draw one of those too.
      const borrowGhost = !ghostPart && parts.length > 0;
      if (borrowGhost) showGhost(parts[0]);
      renderer.render(scene, camera);
      if (borrowGhost) showGhost(null);
      for (const [id, model] of hidden) {
        model.setProgress(lastP.get(id) ?? 0, false);
        model.group.visible = false;
      }
      renderer.render(scene, camera);
      done?.();
      performance.mark('scene-warm');
    };
    whenIdle(step);
  }

  resize();
  window.addEventListener('resize', resize);
  invalidate();

  return {
    prepare: (part: Part): void => { ensure(part); },
    warm,
    showGhost,
    dragStart,
    dragMove,
    dragEnd,
    bounce,
    scrub,
    scrubEnd,
    /** Rebuilds the machine from an empty case, one part after another. */
    replay(): void {
      setPower(false);
      s = 0;
      invalidate();
    },
    /** Called with the visual cursor whenever it moves. */
    setProgressListener(listener: (value: number) => void): void { onProgress = listener; },
    orbit,
    zoomBy,
    resize,
    setPower,
    get powered(): boolean { return powered; },
    /** Timestamp of the input event the next frame answers, for the latency readout. */
    markInput(timeStamp: number): void { pendingInput = timeStamp; },
    stats,
    /** Screen position of the current drop target, for the callout. */
    ghostScreen(): { x: number; y: number } | null {
      if (!ghostPart) return null;
      const boxes = ghostBoxes.get(ghostPart.id);
      if (!boxes?.length) return null;
      const top = boxes[0].getCenter(new Vector3());
      top.y = Math.max(...boxes.map((bounds) => bounds.max.y));
      top.project(camera);
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((top.x + 1) / 2) * rect.width + rect.left,
        y: ((1 - top.y) / 2) * rect.height + rect.top,
      };
    },
  };
}

export type SceneApi = ReturnType<typeof createScene>;
