// The 3D view. It renders only when something changes: an animation, a drag,
// a camera move or the powered-on machine. Idle, it costs nothing.

import {
  AmbientLight,
  Box3,
  BoxGeometry,
  Color,
  DirectionalLight,
  EdgesGeometry,
  Group,
  HemisphereLight,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PCFShadowMap,
  Plane,
  PlaneGeometry,
  PMREMGenerator,
  Raycaster,
  Scene,
  SRGBColorSpace,
  ShadowMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
  type Object3D,
  type ShaderMaterial,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import type { BuildStore, Change } from '../build/store.ts';
import type { CatalogItem, MotherboardPart, Step, StoragePart } from '../catalog/types.ts';
import { radiatorMount, slotsFrom, storageMounts, type Slots, type StorageMount } from '../rules/compat.ts';
import { HOVER, clamp01, easeOut, seg } from './anim.ts';
import { lineMaterial, outline, releaseLineMaterial, setEdgeView, setEdgesVisible } from './edges.ts';
import { M, disposeModel, glowMat, setGlow, setLook, shadows, tube, type Look } from './kit.ts';
import { GPU_ROW, SLOT_PITCH, boardLayout, caseLayout, type BoardLayout } from './layout.ts';
import { buildBoard, type BoardModel } from './models/board.ts';
import { buildCable } from './models/cables.ts';
import { buildCase } from './models/case.ts';
import {
  buildAirCooler,
  buildCpu,
  buildDrive25,
  buildGpu,
  buildLiquidCooler,
  buildM2,
  buildPsu,
  buildRam,
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
  /** Frames that took over 30 ms, with the timeline position they happened at. */
  slow: { at: number; ms: number }[];
}

export type DropResult = 'drop' | 'reject' | 'cancel';

/** A step outside the timeline: leaving, being offered, or bouncing off. */
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

const BG = 0xffffff;
const LOOK_KEY = 'part-by-part:look';
const OLD_LOOK_KEY = 'pc-builder:look'; // the choice saved under the project's working name
const SNAP_PX = 120;
const SHAKE = 0.42;

export function createScene(canvas: HTMLCanvasElement, store: BuildStore, insets: () => Insets) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;

  const scene = new Scene();
  const paper = new Color(BG);
  renderer.info.autoReset = false;

  // Two looks. The drawing is flat plates under even light with every edge
  // drawn as a line; the shaded one is lit, with shadows and reflections.
  scene.background = paper;
  const ambient = new AmbientLight(0xffffff, Math.PI);
  const hemisphere = new HemisphereLight(0xffffff, 0xd4d4d8, 0.75);
  const sun = new DirectionalLight(0xffffff, 3.1);
  sun.position.set(330, 820, 760);
  sun.target.position.set(0, 200, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -500;
  sun.shadow.camera.right = 500;
  sun.shadow.camera.top = 500;
  sun.shadow.camera.bottom = -500;
  sun.shadow.camera.near = 200;
  sun.shadow.camera.far = 2300;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.8;
  scene.add(ambient, hemisphere, sun, sun.target);
  /** Layer used to draw one part on its own, for its picture in the catalog. */
  const SOLO = 2;
  ambient.layers.enable(SOLO);

  const ground = new Mesh(new PlaneGeometry(6000, 6000), new ShadowMaterial({ opacity: 0.2 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ---- the case ------------------------------------------------------------

  let lay = caseLayout(store.pcCase);
  let caseModel = buildCase(store.pcCase, lay);
  let boardFrame = new Group();
  let caseLines: ShaderMaterial | null = null;

  function mountCase(): void {
    lay = caseLayout(store.pcCase);
    caseModel = buildCase(store.pcCase, lay);
    shadows(caseModel.group);
    caseLines = lineMaterial();
    outline(caseModel.group, caseLines);
    scene.add(caseModel.group);
    boardFrame = new Group();
    boardFrame.position.set(lay.board.x, lay.board.y, lay.board.z);
    caseModel.group.add(boardFrame);
    caseModel.backPanel(backT);
  }
  /** Whether the far panel is off, and how far off it is right now (0..1). */
  let back = false;
  let backT = 0;
  mountCase();

  // ---- step models ---------------------------------------------------------

  const models = new Map<string, PartModel>();
  const cardSlots = new Map<string, { first: number; rows: number }>();
  const signatures = new Map<string, string>();
  const lastP = new Map<string, number>();
  const ghostBoxes = new Map<string, Box3[]>();
  const centers = new Map<string, Vector3>();
  const loose = new Map<string, Loose>();
  /** Each model's line material, and which step a model's group belongs to. */
  const linesOf = new Map<string, ShaderMaterial>();
  const owners = new Map<Object3D, string>();

  const boardPart = (): MotherboardPart | undefined =>
    store.steps.find((step): step is MotherboardPart => step.category === 'motherboard');
  const currentLayout = (): BoardLayout => boardLayout(boardPart() ?? 'ATX');
  const currentBoard = (): BoardModel | undefined => {
    const part = boardPart();
    return part ? (models.get(part.id) as BoardModel | undefined) : undefined;
  };
  const fixtures: Fixtures = {
    socket: (open) => currentBoard()?.socket(open),
    dimm: (open) => currentBoard()?.dimm(open),
    latch: (open) => currentBoard()?.latch(open),
    m2: (slot, open) => currentBoard()?.m2(slot, open),
  };
  /** Everything in the timeline, including undone steps, so their geometry can be found. */
  const allSlots = (): Slots => slotsFrom(store.pcCase, store.steps, store.mounts);

  function mountOf(drive: StoragePart): StorageMount {
    const kept = store.mounts.get(drive.id);
    if (kept) return kept;
    const next = slotsFrom(store.pcCase, [...store.installed, drive], store.mounts);
    return storageMounts(next).get(drive.id) ?? { kind: drive.formFactor === 'M.2' ? 'm2' : 'bay', index: 0 };
  }

  /** What a step's shape depends on. When it changes the model is rebuilt. */
  function signature(step: Step): string {
    const board = boardPart()?.id ?? '-';
    switch (step.category) {
      case 'motherboard':
      case 'psu':
        return '';
      case 'storage': {
        const mount = mountOf(step);
        return mount.kind === 'm2' ? `${board}|m2:${mount.index}` : `bay:${mount.index}`;
      }
      case 'cooler':
        return step.kind === 'aio' ? `${board}|${radiatorMount(store.pcCase, step)}` : board;
      case 'cable': {
        const slots = allSlots();
        const mount = step.target ? store.mounts.get(step.target) : undefined;
        return [board, slots.gpu?.id, slots.psu?.id, slots.cooler?.id, mount?.index].join('|');
      }
      default:
        return board;
    }
  }

  function build(step: Step): PartModel {
    const bl = step.category === 'motherboard' ? boardLayout(step) : currentLayout();
    switch (step.category) {
      case 'motherboard': return buildBoard(step, lay, bl);
      case 'cpu': return buildCpu(step, bl, fixtures);
      case 'cooler':
        return step.kind === 'aio'
          ? buildLiquidCooler(step, lay, bl, radiatorMount(store.pcCase, step) ?? 'top')
          : buildAirCooler(step, bl);
      case 'ram': return buildRam(step, bl, fixtures);
      case 'storage': {
        const mount = mountOf(step);
        return mount.kind === 'm2' ? buildM2(step, bl, mount.index, fixtures) : buildDrive25(step, lay, mount.index);
      }
      case 'gpu':
        // Which of the case's slot covers this card takes the place of
        cardSlots.set(step.id, {
          first: Math.round((bl.pcie.rows[0].v - GPU_ROW) / SLOT_PITCH) + 1,
          rows: Math.ceil(step.slots),
        });
        return buildGpu(step, bl, fixtures);
      case 'psu': return buildPsu(step, lay);
      case 'cable':
        return buildCable(step, { lay, bl, slots: allSlots(), mounts: new Map(store.mounts) });
    }
  }

  function drop(id: string): void {
    const model = models.get(id);
    if (model) {
      owners.delete(model.group);
      disposeModel(model.group);
    }
    const lines = linesOf.get(id);
    if (lines) releaseLineMaterial(lines);
    linesOf.delete(id);
    models.delete(id);
    cardSlots.delete(id);
    signatures.delete(id);
    ghostBoxes.delete(id);
    centers.delete(id);
  }

  function ensure(step: Step): PartModel {
    const wanted = signature(step);
    const existing = models.get(step.id);
    if (existing && signatures.get(step.id) === wanted) return existing;
    const shown = existing ? lastP.get(step.id) ?? 0 : 0;
    if (existing) drop(step.id);

    const model = build(step);
    shadows(model.group);
    const lines = lineMaterial();
    lines.uniforms.emphasis.value = linesOf.get(step.id)?.uniforms.emphasis.value ?? 0;
    outline(model.group, lines);
    linesOf.set(step.id, lines);
    owners.set(model.group, step.id);
    (model.frame === 'board' ? boardFrame : caseModel.group).add(model.group);
    models.set(step.id, model);
    signatures.set(step.id, wanted);

    // Measure where it ends up (for the drop target) and where it hovers.
    model.group.visible = true;
    model.setProgress(1, false);
    caseModel.group.updateMatrixWorld(true);
    ghostBoxes.set(step.id, (model.ghostTargets ?? [model.group]).map((target) =>
      new Box3().setFromObject(target).expandByScalar(1.5)));
    model.setProgress(HOVER, false);
    caseModel.group.updateMatrixWorld(true);
    centers.set(step.id, new Box3().setFromObject(model.group).getCenter(new Vector3()));
    model.setProgress(0, false);
    model.group.visible = false;
    lastP.set(step.id, 0);
    if (shown > 0) pose(step.id, shown, false, true);
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

  /** Drop targets live on their own layer, so a part can be pictured without them. */
  const OVERLAY = 1;
  const ghost = new Group();
  scene.add(ghost);
  const unitBox = new BoxGeometry(1, 1, 1);
  const unitEdges = new EdgesGeometry(unitBox);
  const ghostFill = {
    ok: new MeshBasicMaterial({ color: 0x16a34a, transparent: true, opacity: 0.14, depthWrite: false }),
    bad: new MeshBasicMaterial({ color: 0xdc2626, transparent: true, opacity: 0.14, depthWrite: false }),
  };
  const ghostLine = {
    ok: new LineBasicMaterial({ color: 0x16a34a, transparent: true, opacity: 0.95, depthTest: false }),
    bad: new LineBasicMaterial({ color: 0xdc2626, transparent: true, opacity: 0.95, depthTest: false }),
  };
  let ghostStep: Step | null = null;

  function showGhost(step: Step | null, blocked = false): void {
    ghost.clear();
    ghostStep = step;
    if (step) {
      ensure(step);
      const kind = blocked ? 'bad' : 'ok';
      for (const bounds of ghostBoxes.get(step.id) ?? []) {
        const size = bounds.getSize(new Vector3());
        const center = bounds.getCenter(new Vector3());
        const fill = new Mesh(unitBox, ghostFill[kind]);
        const line = new LineSegments(unitEdges, ghostLine[kind]);
        line.renderOrder = 10;
        for (const item of [fill, line]) {
          item.layers.set(OVERLAY);
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
    ghostFill.ok.opacity = ghostFill.bad.opacity = strong ? 0.3 : 0.14;
  }

  // ---- camera --------------------------------------------------------------

  // An orthographic camera: parallel lines stay parallel, as in a technical drawing.
  const camera = new OrthographicCamera(-1, 1, 1, -1, 10, 9000);
  camera.layers.enable(OVERLAY);
  const center = new Vector3(0, lay.H * 0.5, 0);
  const view = { az: 0.62, el: 0.4, zoom: 1 };
  const viewTarget = { ...view };
  /** Scene millimetres across the full height of the canvas at zoom 1. */
  let span = 1000;
  let width = 1;
  let height = 1;

  function resize(): void {
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    const inset = insets();
    const freeW = Math.max(240, width - inset.left - inset.right);
    const freeH = Math.max(240, height - inset.top - inset.bottom);
    camera.setViewOffset(
      width, height,
      (inset.right - inset.left) / 2, (inset.bottom - inset.top) / 2,
      width, height,
    );
    // How big the case looks from the resting angle, then fit that in the free area.
    const [sinA, cosA] = [Math.sin(0.62), Math.cos(0.62)];
    const [sinE, cosE] = [Math.sin(0.4), Math.cos(0.4)];
    const objectW = lay.L * cosA + lay.W * sinA;
    const objectH = lay.H * cosE + (lay.L * sinA + lay.W * cosA) * sinE;
    span = Math.max((objectH * 1.14 * height) / freeH, (objectW * 1.14 * height) / freeW);
    center.set(0, lay.H * 0.5, 0);
    invalidate();
  }

  function placeCamera(): void {
    const cosEl = Math.cos(view.el);
    camera.position.set(
      center.x + 3000 * Math.sin(view.az) * cosEl,
      center.y + 3000 * Math.sin(view.el),
      center.z + 3000 * Math.cos(view.az) * cosEl,
    );
    camera.lookAt(center);
    const half = (span * view.zoom) / 2;
    camera.top = half;
    camera.bottom = -half;
    camera.left = (-half * width) / height;
    camera.right = (half * width) / height;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  // ---- look ----------------------------------------------------------------

  let look: Look = 'drawing';
  try {
    if ((localStorage.getItem(LOOK_KEY) ?? localStorage.getItem(OLD_LOOK_KEY)) === 'shaded') look = 'shaded';
  } catch {
    // Storage may be unavailable; the drawing look is the default.
  }
  let environment: ReturnType<PMREMGenerator['fromScene']>['texture'] | null = null;

  function applyLook(): void {
    const shaded = look === 'shaded';
    setLook(look);
    ambient.visible = !shaded;
    hemisphere.visible = shaded;
    sun.visible = shaded;
    ground.visible = shaded;
    setEdgesVisible(!shaded);
    if (shaded && !environment) {
      const pmrem = new PMREMGenerator(renderer);
      environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    }
    scene.environment = shaded ? environment : null;
    scene.environmentIntensity = 0.6;
    invalidate();
  }

  /** Draws one frame in the current look. */
  /**
   * Parts prepared ahead of a click wait outside the scene. A hidden part left
   * in it would still be walked on every frame and by every pointer pick, and
   * with a large catalog there are many of them.
   */
  function attachShown(): void {
    for (const model of models.values()) {
      const group = model.group;
      if (group.visible === (group.parent !== null)) continue;
      if (group.visible) (model.frame === 'board' ? boardFrame : caseModel.group).add(group);
      else group.removeFromParent();
    }
  }

  function draw(): void {
    attachShown();
    renderer.info.reset();
    const buffer = renderer.getDrawingBufferSize(new Vector2());
    setEdgeView(buffer.x, buffer.y, renderer.getPixelRatio());
    renderer.render(scene, camera);
  }

  /** How quickly the view closes on where it is headed: quick under the hand, slower for a turn of its own. */
  let pace = 14;
  const REST = { az: 0.62, el: 0.4 };

  /** Takes the far panel off and turns the machine to show the cables behind the tray, or puts it back. */
  let onBack: ((open: boolean) => void) | null = null;
  function setBack(open: boolean): void {
    if (back === open) return;
    back = open;
    onBack?.(open);
    const az = open ? Math.PI - REST.az : REST.az;
    viewTarget.az = az + Math.round((viewTarget.az - az) / (Math.PI * 2)) * Math.PI * 2;
    viewTarget.el = open ? 0.3 : REST.el;
    pace = 4.5;
    invalidate();
  }

  function orbit(dx: number, dy: number): void {
    // All the way round: the back of the machine is part of the drawing.
    pace = 14;
    viewTarget.az -= dx * 0.006;
    viewTarget.el = Math.max(0.05, Math.min(1.2, viewTarget.el + dy * 0.005));
    invalidate();
  }

  function zoomBy(delta: number): void {
    viewTarget.zoom = Math.max(0.5, Math.min(1.7, viewTarget.zoom * Math.exp(delta * 0.0012)));
    invalidate();
  }

  // ---- timeline ------------------------------------------------------------

  /** Visual cursor: step i is at progress clamp(s - i). Chases store.cursor. */
  let s = store.cursor;
  let scrubbing = false;
  let lastReported = -1;
  let onProgress: ((value: number) => void) | null = null;

  /** Anything on screen that is no longer in the timeline leaves. */
  function reconcile(): void {
    const inSteps = new Set(store.steps.map((step) => step.id));
    for (const [id, p] of lastP) {
      if (p > 0 && !inSteps.has(id) && !loose.has(id) && visitor?.step.id !== id) {
        loose.set(id, { p, target: 0, drive: true, shake: 0 });
      }
    }
  }

  function swapCase(): void {
    showGhost(null);
    for (const id of [...models.keys()]) drop(id);
    lastP.clear();
    loose.clear();
    visitor = null;
    caseModel.group.removeFromParent();
    if (caseLines) releaseLineMaterial(caseLines);
    mountCase();
    s = store.cursor;
    resize();
  }

  function onStoreChange(change: Change): void {
    setPower(false);
    // A new case, or a build loaded afresh: draw everything again from the data.
    if (change.kind === 'case' || change.kind === 'reset') {
      swapCase();
      return;
    }
    if (change.kind === 'install' && change.step && change.index !== undefined) {
      // A part goes in from the open side, so the machine turns back to show it.
      // A cable can be watched from either side.
      if (change.step.category !== 'cable') setBack(false);
      ensure(change.step);
      const start = loose.get(change.step.id)?.p ?? 0;
      loose.delete(change.step.id);
      // A dropped step carries on from where it is held, so whatever was still
      // seating before it finishes at once. A clicked one waits its turn.
      s = start > 0 ? change.index + start : Math.min(s, change.index);
    } else if (change.kind === 'remove' && change.step && change.index !== undefined) {
      const p = clamp01(s - change.index);
      if (s > change.index) s = Math.max(change.index, s - 1);
      if (p > 0) loose.set(change.step.id, { p, target: 0, drive: true, shake: 0 });
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

  // ---- offering a step: drag, drop, reject ---------------------------------

  interface Visitor {
    step: Step;
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

  function dragStart(step: Step, blocked: boolean): void {
    const model = ensure(step);
    loose.delete(step.id);
    pose(step.id, HOVER, false, true);
    visitor = {
      step,
      model,
      blocked,
      snapped: false,
      hoverLocal: model.group.position.clone(),
      centerWorld: centers.get(step.id)!.clone(),
    };
    model.group.visible = false;
    showGhost(step, blocked);
  }

  /** Moves the held step under the pointer. Returns true while it is snapped to its slot. */
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
    const id = held.step.id;
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

  /** A blocked step comes up to its slot, shakes, and goes away again. */
  function bounce(step: Step): void {
    if (store.steps.some((item) => item.id === step.id)) return;
    ensure(step);
    const from = loose.get(step.id)?.p ?? 0;
    loose.set(step.id, { p: from, target: HOVER, drive: false, shake: SHAKE });
    showGhost(step, true);
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
    const seated = new Set(store.installed.map((step) => step.id));
    const spin = dt * 15 * power;
    for (const rotor of caseModel.rotors) rotor.rotation.z += spin;
    for (const material of caseModel.glow) setGlow(material, power);
    for (const [id, model] of models) {
      const on = seated.has(id) ? power : 0;
      for (const material of model.glow) setGlow(material, on);
      if (on > 0) for (const rotor of model.rotors) rotor.rotation.z += spin * 1.25;
    }
    return true;
  }

  // ---- what is picked out ----------------------------------------------------

  /** The step under the pointer in the scene, and the one whose row is hovered in a list. */
  let pointed: string | null = null;
  let named: string | null = null;

  /** Finds the part under the pointer. The case itself hides what is behind it. */
  function hoverAt(clientX: number, clientY: number): string | null {
    let found: string | null = null;
    if (!visitor) {
      const rect = canvas.getBoundingClientRect();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      for (const hitAt of raycaster.intersectObject(caseModel.group, true)) {
        let node: Object3D | null = hitAt.object;
        let owner: string | undefined;
        let hidden = false;
        while (node && node !== caseModel.group) {
          if (!node.visible) hidden = true;
          owner ??= owners.get(node);
          node = node.parent;
        }
        if (hidden) continue;
        found = owner ?? null;
        break;
      }
    }
    if (found !== pointed) {
      pointed = found;
      invalidate();
    }
    return found;
  }

  /**
   * Lines rest light. The part under the pointer, the one named in a list, the
   * one being offered and the one going in or out are drawn dark, fading in.
   */
  function stepEmphasis(dt: number): boolean {
    const lit = new Set<string>();
    if (pointed) lit.add(pointed);
    if (named) lit.add(named);
    if (visitor) lit.add(visitor.step.id);
    for (const id of loose.keys()) lit.add(id);
    const target = scrubbing ? s : store.cursor;
    if (s !== target && store.steps.length) {
      const index = Math.max(0, Math.min(store.steps.length - 1, s < target ? Math.floor(s) : Math.ceil(s) - 1));
      lit.add(store.steps[index].id);
    }
    let moving = false;
    for (const [id, lines] of linesOf) {
      const goal = lit.has(id) ? 1 : 0;
      const level = lines.uniforms.emphasis;
      if (level.value === goal) continue;
      level.value = goal > level.value
        ? Math.min(goal, level.value + dt / 0.12)
        : Math.max(goal, level.value - dt / 0.28);
      moving = true;
    }
    return moving;
  }

  // ---- frame loop ----------------------------------------------------------

  let raf = 0;
  let lastTime = 0;
  let pendingInput: number | null = null;
  let firstFrame = true;
  const stats: SceneStats = { frames: [], inputLatency: null, drawCalls: 0, triangles: 0, settled: true, rendered: 0, slow: [] };

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
          if (ghostStep?.id === id && !visitor) showGhost(null);
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
      // With steps queued up behind this one, go faster so the queue drains.
      const backlog = Math.max(0, Math.abs(target - s) - 1);
      const rate = ((forward ? 1 : 2) * (1 + backlog * 0.7)) / duration;
      s = forward ? Math.min(target, s + rate * dt) : Math.max(target, s - rate * dt);
      active = true;
    }
    store.steps.forEach((step, i) => {
      ensure(step);
      pose(step.id, clamp01(s - i), true);
    });
    if (s !== lastReported) {
      lastReported = s;
      onProgress?.(s);
    }
    if (stepLoose(dt)) active = true;
    // The slot covers come out as a graphics card starts down toward its slot.
    let open = { first: 0, rows: 0 };
    for (const [id, slots] of cardSlots) if ((lastP.get(id) ?? 0) > 0.3) open = slots;
    caseModel.openSlots(open.first, open.rows);
    if (applyPower(dt)) active = true;
    if (stepEmphasis(dt)) active = true;

    const backGoal = back ? 1 : 0;
    if (backT !== backGoal) {
      backT = backGoal > backT ? Math.min(1, backT + dt / 0.9) : Math.max(0, backT - dt / 0.7);
      caseModel.backPanel(backT);
      active = true;
    }

    const ease = 1 - Math.exp(-dt * pace);
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

    draw();

    stats.rendered++;
    stats.drawCalls = renderer.info.render.calls;
    stats.triangles = renderer.info.render.triangles;
    stats.settled = !active && !visitor;
    if (lastTime && active) {
      if (now - lastTime > 30) stats.slow.push({ at: Number(s.toFixed(2)), ms: Math.round(now - lastTime) });
      stats.frames.push(now - lastTime);
      if (stats.frames.length > 1800) stats.frames.shift();
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

  // ---- pictures of single parts ---------------------------------------------

  let studio: { out: WebGLRenderTarget; camera: OrthographicCamera; canvas: HTMLCanvasElement } | null = null;
  const RESTING = new Vector3(Math.sin(REST.az) * Math.cos(REST.el), Math.sin(REST.el), Math.cos(REST.az) * Math.cos(REST.el));

  /**
   * Draws `target` alone, from the resting angle, and returns it as an image
   * address. `scale` is how many picture pixels make one pixel where it is shown.
   */
  function picture(target: Object3D, w: number, h: number, scale: number): string {
    studio ??= {
      out: new WebGLRenderTarget(1, 1, { samples: 4 }),
      camera: new OrthographicCamera(-1, 1, 1, -1, 10, 9000),
      canvas: document.createElement('canvas'),
    };
    const { out, camera: eye, canvas: sheet } = studio;
    out.texture.colorSpace = SRGBColorSpace;
    if (out.width !== w || out.height !== h) {
      out.setSize(w, h);
      sheet.width = w;
      sheet.height = h;
    }

    target.updateWorldMatrix(true, true);
    const bounds = new Box3().setFromObject(target);
    const middle = bounds.getCenter(new Vector3());
    eye.position.copy(middle).addScaledVector(RESTING, 3000);
    eye.lookAt(middle);
    eye.updateMatrixWorld();
    const right = new Vector3().setFromMatrixColumn(eye.matrixWorld, 0);
    const up = new Vector3().setFromMatrixColumn(eye.matrixWorld, 1);
    let halfW = 1;
    let halfH = 1;
    const corner = new Vector3();
    for (let i = 0; i < 8; i++) {
      corner.set(
        i & 1 ? bounds.max.x : bounds.min.x,
        i & 2 ? bounds.max.y : bounds.min.y,
        i & 4 ? bounds.max.z : bounds.min.z,
      ).sub(middle);
      halfW = Math.max(halfW, Math.abs(corner.dot(right)));
      halfH = Math.max(halfH, Math.abs(corner.dot(up)));
    }
    const half = Math.max(halfH, (halfW * h) / w) * 1.16;
    eye.top = half;
    eye.bottom = -half;
    eye.left = (-half * w) / h;
    eye.right = (half * w) / h;
    eye.updateProjectionMatrix();

    target.traverse((node) => node.layers.set(SOLO));
    eye.layers.set(SOLO);
    setEdgeView(w, h, scale);
    renderer.setRenderTarget(out);
    renderer.render(scene, eye);
    renderer.setRenderTarget(null);
    target.traverse((node) => node.layers.set(0));

    const pixels = new Uint8Array(w * h * 4);
    renderer.readRenderTargetPixels(out, 0, 0, w, h, pixels);
    const context = sheet.getContext('2d')!;
    const image = context.createImageData(w, h);
    for (let row = 0; row < h; row++) {
      image.data.set(pixels.subarray((h - 1 - row) * w * 4, (h - row) * w * 4), row * w * 4);
    }
    context.putImageData(image, 0, 0);
    return sheet.toDataURL('image/png');
  }

  /**
   * A line drawing of one catalog item on its own, or null when one cannot be
   * made right now (the shaded look is on, or something is being dragged).
   */
  function thumbnail(item: CatalogItem | Step, w: number, h: number, scale: number): string | null {
    if (look !== 'drawing' || visitor || item.category === 'cable') return null;
    if (item.category === 'case') {
      const model = buildCase(item, caseLayout(item));
      const lines = lineMaterial();
      outline(model.group, lines);
      scene.add(model.group);
      const url = picture(model.group, w, h, scale);
      disposeModel(model.group);
      releaseLineMaterial(lines);
      return url;
    }
    const model = ensure(item);
    const was = lastP.get(item.id) ?? 0;
    model.group.visible = true;
    model.setProgress(1, false);
    model.group.scale.setScalar(1);
    if (model.portrait) model.group.rotation.set(...model.portrait);
    attachShown();
    const url = picture(model.group, w, h, scale);
    if (model.portrait) model.group.rotation.set(0, 0, 0);
    pose(item.id, was, false, true);
    return url;
  }

  const whenIdle = (task: () => void): void => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(task, { timeout: 600 });
    else setTimeout(task, 60);
  };

  /**
   * Compiles every shader the parts will need, once, while the page is idle:
   * a throwaway rig with one of each kind of material and geometry is drawn
   * and removed. After this a new part costs only its own small buffers.
   */
  function warmShaders(done?: () => void): void {
    whenIdle(() => {
      const rig = new Group();
      rig.position.copy(center);
      Object.values(M).forEach((material, i) => {
        const sample = new Mesh(unitBox, material);
        sample.position.set(i * 3 - 60, 0, 0);
        rig.add(sample);
      });
      rig.add(new InstancedMesh(unitBox, M.alu, 2));
      tube(rig, [[0, 0, 0], [10, 10, 0], [20, 0, 0]], 2, M.cable);
      rig.add(new Mesh(unitBox, glowMat(0xffffff, 0xffffff)));
      shadows(rig);
      const rigLines = lineMaterial();
      outline(rig, rigLines);
      const outlineSample = [new Mesh(unitBox, ghostFill.ok), new LineSegments(unitEdges, ghostLine.ok)];
      for (const item of outlineSample) item.layers.set(OVERLAY);
      ghost.add(...outlineSample);
      scene.add(rig);
      draw();
      ghost.remove(...outlineSample);
      disposeModel(rig);
      releaseLineMaterial(rigLines);
      draw();
      done?.();
      performance.mark('scene-warm');
    });
  }

  /** Builds the given steps a little at a time while the page is idle, ahead of a click. */
  function warm(steps: Step[]): void {
    const queue = [...steps];
    const step = (): void => {
      if (!queue.length) return;
      // Never while something is moving or being dragged: building a part
      // takes a few milliseconds, and on a slow machine that is a late frame.
      if (stats.settled && !visitor) ensure(queue.shift()!);
      whenIdle(step);
    };
    whenIdle(step);
  }

  applyLook();
  resize();
  window.addEventListener('resize', resize);
  invalidate();

  return {
    prepare: (step: Step): void => { ensure(step); },
    warm,
    warmShaders,
    thumbnail,
    hoverAt,
    /** Picks out the part with this id (a row hovered in a list), or none. */
    emphasize(id: string | null): void {
      if (named === id) return;
      named = id;
      invalidate();
    },
    showGhost,
    dragStart,
    dragMove,
    dragEnd,
    bounce,
    scrub,
    scrubEnd,
    /** Rebuilds the machine from an empty case, one step after another. */
    replay(): void {
      setPower(false);
      s = 0;
      invalidate();
    },
    /** Called with the visual cursor whenever it moves. */
    setProgressListener(listener: (value: number) => void): void { onProgress = listener; },
    orbit,
    zoomBy,
    setBack,
    get back(): boolean { return back; },
    /** Called when the far panel comes off or goes back on. */
    setBackListener(listener: (open: boolean) => void): void { onBack = listener; },
    resize,
    setPower,
    get powered(): boolean { return powered; },
    get look(): Look { return look; },
    /** Switches between the line drawing and the shaded view, and remembers the choice. */
    setLook(next: Look): void {
      look = next;
      try {
        localStorage.setItem(LOOK_KEY, next);
      } catch {
        // Not remembered; it still applies for this visit.
      }
      applyLook();
    },
    /** Timestamp of the input event the next frame answers, for the latency readout. */
    markInput(timeStamp: number): void { pendingInput = timeStamp; },
    stats,
    /** Screen position of the current drop target, for the callout. */
    ghostScreen(): { x: number; y: number } | null {
      if (!ghostStep) return null;
      const boxes = ghostBoxes.get(ghostStep.id);
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
