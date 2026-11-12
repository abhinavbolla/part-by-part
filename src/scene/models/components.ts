// The parts that go into the case. Each is drawn from its catalog dimensions
// and, where the catalog records them, the features you would recognise it
// by: a cooler's heat pipes, stacks and top; what the top of a memory module
// looks like; a card's fans, shroud, backplate and edges. No logos, and no
// brand artwork.

import { Group, Mesh, Object3D, type Material } from 'three';

import type {
  AirCoolerPart,
  CpuPart,
  GpuPart,
  LiquidCoolerPart,
  PsuPart,
  RamPart,
  StoragePart,
} from '../../catalog/types.ts';
import { HOVER, driveScrew, easeInOut, easeOut, push, seg, travel, type Travel } from '../anim.ts';
import { PANEL, packageSize, psuBody, type BoardLayout, type CaseLayout } from '../layout.ts';
import {
  ALONG_X,
  M,
  box,
  chamfered,
  circle,
  copies,
  cyl,
  fan,
  glowMat,
  prism,
  prismGeometry,
  reveal,
  ring,
  screw,
  tube,
} from '../kit.ts';
import type { Fixtures, PartModel } from './types.ts';

export const CPU_HEIGHT = 4.4;

/** Open while the part comes in over [a0, a1], shut again over [b0, b1]. */
const openShut = (p: number, a0: number, a1: number, b0: number, b1: number): number =>
  easeInOut(seg(p, a0, a1)) * (1 - easeInOut(seg(p, b0, b1)));

/** A square with rectangular bites out of each side, as an AM5 heat spreader has. */
function notchedSquare(half: number, notchWidth: number, notchDepth: number, centres: number[]): [number, number][] {
  const side: [number, number][] = [[-half, -half]];
  for (const centre of centres) {
    side.push(
      [centre - notchWidth / 2, -half],
      [centre - notchWidth / 2, -half + notchDepth],
      [centre + notchWidth / 2, -half + notchDepth],
      [centre + notchWidth / 2, -half],
    );
  }
  const points: [number, number][] = [];
  for (let turn = 0; turn < 4; turn++) {
    for (const [x, y] of side) {
      // Each quarter turn carries the bottom side round to the next one.
      const rotated: [number, number] = turn === 0 ? [x, y] : turn === 1 ? [-y, x] : turn === 2 ? [-x, -y] : [y, -x];
      points.push(rotated);
    }
  }
  return points;
}

export function buildCpu(part: CpuPart, bl: BoardLayout, fx: Fixtures): PartModel {
  const group = new Group();
  const { w, h } = packageSize(part.socket);
  box(group, w, h, 1.2, M.substrate, 0, 0, 0.6);
  if (part.socket.startsWith('LGA')) {
    // Intel: a stepped lid, the lower step being what the socket's frame presses on.
    prism(group, chamfered(w - 7, h - 5, 2.5), 1.3, M.steel, 0, 0, 1.2);
    prism(group, chamfered(w - 15, h - 9, 2.5), CPU_HEIGHT - 2.5, M.steel, 0, 0, 2.5);
    for (const sy of [-1, 1]) cyl(group, 1.4, 1.25, M.slot, 'z', -w / 2 + 6, sy * (h / 2 - 1), 0.62, true);
  } else {
    // AMD AM5: a lid with two bites out of every side, small capacitors showing in them.
    const half = w / 2 - 2.5;
    prism(group, notchedSquare(half, 4.6, 4.2, [-7.2, 7.2]), CPU_HEIGHT - 1.2, M.steel, 0, 0, 1.2);
    for (let turn = 0; turn < 4; turn++) {
      for (const centre of [-7.2, 7.2]) {
        const [x, y] = turn === 0 ? [centre, -half + 1.6] : turn === 1 ? [half - 1.6, centre] : turn === 2 ? [centre, half - 1.6] : [-half + 1.6, centre];
        box(group, turn % 2 ? 1.1 : 2.6, turn % 2 ? 2.6 : 1.1, 0.7, M.chip, x, y, 1.55);
      }
    }
  }
  box(group, 3, 3, 0.2, M.gold, -w / 2 + 2.5, -h / 2 + 2.5, 1.3);

  const seat: Travel = {
    seat: [bl.socket.u, -bl.socket.v, bl.socket.top],
    hover: [0, 0, 64],
    enter: [0, 0, 230],
  };
  return {
    group,
    frame: 'board',
    duration: 2.3,
    rotors: [],
    glow: [],
    setProgress(p, drive) {
      travel(group, p, seat, 0.4, 0.68, easeInOut);
      if (drive) fx.socket(openShut(p, 0.04, 0.34, 0.72, 0.98));
    },
  };
}

type AirLook = NonNullable<AirCoolerPart['look']>;

/** One fin seen from above: `depth` along the airflow, `width` across it. */
function finOutline(depth: number, width: number, style: AirLook['fins']): [number, number][] {
  if (style === 'plain') return chamfered(depth, width, 2.5);
  // Both edges that face a fan step in and out along their length
  const [x, y] = [depth / 2, width / 2];
  const teeth = Math.max(4, Math.round(width / 9));
  const pitch = (width - 8) / teeth;
  const points: [number, number][] = [[-x, -y], [x, -y]];
  for (let i = 0; i < teeth; i++) {
    const from = -y + 4 + i * pitch;
    points.push([x, from], [x, from + pitch / 2], [x - 1.8, from + pitch / 2], [x - 1.8, from + pitch]);
  }
  points.push([x, y - 4], [x, y], [-x, y]);
  for (let i = 0; i < teeth; i++) {
    const from = y - 4 - i * pitch;
    points.push([-x, from], [-x, from - pitch / 2], [-x + 1.8, from - pitch / 2], [-x + 1.8, from - pitch]);
  }
  points.push([-x, -y + 4]);
  return points;
}

const FIN_BASE = 34;
const COVER = 8;

/**
 * A stack of fins standing over the cooler base, the pipe legs that pass up
 * through it at `legs`, and whatever finishes the top. `out` is the side its
 * outer face is on: the lowest fins are cut back there.
 */
function finStack(parent: Object3D, depth: number, width: number, height: number, x: number, y: number, out: number, look: AirLook, legs: [number, number][]): void {
  const pitch = 4;
  const covered = look.top !== 'bare' && look.top !== 'caps';
  const top = covered ? height - COVER - 1 : height - 3;
  const count = Math.floor((top - FIN_BASE) / pitch);
  const [stepTall, stepDeep] = look.cutaway;
  const low = Math.ceil(stepTall / pitch);
  const short = Math.min(stepDeep, depth * 0.5);
  // The stack is plain plates, kept cheap; only the fin on top carries the real outline
  const plain = look.fins === 'plain' ? depth : depth - 3.6;
  copies(parent, count, M.alu, (dummy, i) => {
    dummy.position.set(i < low ? x - (out * short) / 2 : x, y, FIN_BASE + i * pitch + 0.3);
    dummy.scale.set(i < low ? plain - short : plain, width - (look.fins === 'plain' ? 0 : 1), 0.6);
  });

  if (!covered) {
    prism(parent, finOutline(depth, width, look.fins), 1.4, M.alu, x, y, top);
  } else if (look.top !== 'hood') {
    prism(parent, chamfered(depth + 2, width + 2, 4), COVER, M.heatsinkDark, x, y, height - COVER);
    if (look.top === 'plate') {
      // A plain plate with a six-sided outline pressed into its middle
      prism(parent, circle(11, 6), 0.5, M.slotAlt, x, y, height);
    } else {
      // A fine square grid inside a plain rim
      const cell = 5;
      const [cols, rows] = [Math.floor((depth - 8) / cell), Math.floor((width - 12) / cell)];
      copies(parent, cols + rows + 2, M.slotAlt, (dummy, i) => {
        if (i <= cols) {
          dummy.position.set(x + (i - cols / 2) * cell, y, height + 0.2);
          dummy.scale.set(0.7, rows * cell, 0.5);
        } else {
          dummy.position.set(x, y + (i - cols - 1 - rows / 2) * cell, height + 0.2);
          dummy.scale.set(cols * cell, 0.7, 0.5);
        }
      });
    }
  }

  const capped = look.top === 'caps';
  const pipeTop = covered ? height - COVER - 1 : height + (capped ? 2 : 4);
  copies(parent, legs.length * (capped ? 2 : 1), M.steel, (dummy, i) => {
    const [lx, ly] = legs[i % legs.length];
    dummy.rotation.x = Math.PI / 2;
    if (i < legs.length) {
      dummy.position.set(lx, ly, 30 + (pipeTop - 30) / 2);
      dummy.scale.set(3, pipeTop - 30, 3);
    } else {
      dummy.position.set(lx, ly, height + 1.6);
      dummy.scale.set(4.2, 4.6, 4.2);
    }
  }, 'rod');
}

export function buildAirCooler(part: AirCoolerPart, bl: BoardLayout): PartModel {
  const group = new Group();
  const fanDepth = 25;
  const towers = part.towers;
  const look: AirLook = part.look ?? {
    pipes: towers === 2 ? 6 : 4, stack: [], top: 'bare', fins: 'plain', cutaway: [0, 0], fanFrame: 'square', blades: 7, clips: true,
  };
  const pipes = look.pipes;
  const derived = Math.max(30, (part.depth - fanDepth * part.fans - (towers === 2 ? 5 : 0)) / towers);
  const stacks = Array.from({ length: towers }, (_, i) => look.stack[i] ?? derived);
  const spread = (i: number): number => i - (pipes - 1) / 2;
  const dy = look.offset ?? 0;
  const dx = -(look.back ?? 0); // set back from the base along the airflow
  const depthOf = (i: number): number => look.fanDepths?.[i] ?? fanDepth;
  const gap = 30; // between twin towers; the middle fan hangs in it

  // The contact plate, the block the pipes are soldered into, and the bar that clamps it down
  box(group, 40, 40, 4, M.copper, 0, 0, 2);
  const across = Math.min(70, pipes * 7.6 + 6);
  if (towers === 2) box(group, 44, across, 11, M.alu, 0, 0, 9.5);
  else box(group, across, 44, 11, M.alu, 0, 0, 9.5);
  box(group, 14, 104, 3, M.steel, 0, 0, 16.5);

  // Along x from the front: [fan] tower [fan] tower. A single tower has its fan in front.
  const centres = towers === 2 ? [dx + gap / 2 + stacks[0] / 2, dx - (gap / 2 + stacks[1] / 2)] : [dx];
  const bend = (points: [number, number, number][]): void => { tube(group, points, 3, M.steel, true, 6); };
  if (towers === 2) {
    // Each pipe lies across the base and rises once into each tower, the legs in a row
    const reach = part.width / 2 - 14;
    const legY = (i: number): number => dy + (pipes === 1 ? 0 : (spread(i) * 2 * reach) / (pipes - 1));
    centres.forEach((cx, tower) => {
      const side = tower === 0 ? 1 : -1;
      const legs = Array.from({ length: pipes }, (_, i): [number, number] => [cx, legY(i)]);
      finStack(group, stacks[tower], part.width, part.height, cx, dy, side, look, legs);
      legs.forEach(([lx, ly], i) => {
        const by = spread(i) * 7.6;
        bend([[side * 8, by, 9.5], [side * 20, by, 10], [(side * 20 + lx) / 2 + side * 4, (by + ly) / 2, 19], [lx, ly, 31]]);
      });
    });
  } else {
    // Each pipe lies along the base and rises on both sides of the one tower, staggered through its depth
    const run = stacks[0] - 16;
    const legs: [number, number][] = [];
    for (let i = 0; i < pipes; i++) {
      const lx = dx + (pipes === 1 ? 0 : (spread(i) * run) / (pipes - 1));
      const reach = part.width * 0.25 + (i % 2) * 12;
      for (const side of [-1, 1]) {
        legs.push([lx, dy + side * reach]);
        const bx = spread(i) * 7.6;
        bend([[bx, side * 8, 9.5], [bx, side * 22, 10], [(bx + lx) / 2, side * (22 + reach) / 2 + side * 5, 19], [lx, dy + side * reach, 31]]);
      }
    }
    finStack(group, stacks[0], part.width, part.height, dx, dy, 1, look, legs);
  }

  // One lid over both towers and the fan between them. It goes on last.
  const hood = new Group();
  if (look.top === 'hood') {
    const [front, rear] = [centres[0] + stacks[0] / 2, centres[centres.length - 1] - stacks[stacks.length - 1] / 2];
    const [long, mid] = [front - rear + 2, (front + rear) / 2];
    prism(hood, roundedRect(long, part.width, 12), COVER, M.heatsinkDark, mid, dy, -COVER);
    centres.forEach((cx, tower) => {
      // A mesh inlay over each tower: a dark panel under rows of fine slits
      const inlay = stacks[tower] - 12;
      box(hood, inlay, part.width - 34, 0.5, M.vent, cx, dy, 0.2);
      const lines = Math.floor(inlay / 3.4);
      copies(hood, lines, M.heatsinkDark, (dummy, i) => {
        dummy.position.set(cx + (i - (lines - 1) / 2) * 3.4, dy, 0.5);
        dummy.scale.set(1.3, part.width - 38, 0.4);
      });
    });
    group.add(hood);
  }

  const sizes = look.fanSizes ?? Array<number>(part.fans).fill(part.fanSize);
  // Fans in airflow order: the one in front first
  const fanSpots: { x: number; from: [number, number, number]; between: boolean }[] = [];
  if (towers === 2) {
    if (part.fans > 1) fanSpots.push({ x: dx + gap / 2 + stacks[0] + depthOf(0) / 2 + 0.5, from: [64, 0, 0], between: false });
    fanSpots.push({ x: dx, from: [0, 0, 150], between: true });
  } else {
    fanSpots.push({ x: dx + stacks[0] / 2 + depthOf(0) / 2 + 0.5, from: [64, 0, 0], between: false });
    if (part.fans > 1) fanSpots.push({ x: dx - (stacks[0] / 2 + depthOf(1) / 2 + 0.5), from: [-64, 0, 0], between: false });
  }
  const covered = look.top !== 'bare' && look.top !== 'caps';
  const fans = fanSpots.map((spot, i) => {
    const size = sizes[Math.min(i, sizes.length - 1)];
    const { between } = spot;
    const deep = depthOf(i);
    const blower = fan(group, size, deep, look.fanBlades?.[i] ?? look.blades, look.fanFrame === 'round');
    blower.group.rotation.y = Math.PI / 2;
    if (look.clips && !(between && look.top === 'hood')) {
      // Wire clips: two arms across the frame's side to a wire that springs into the fins.
      // In the fan's own frame x is up the cooler, y across it and z along the airflow.
      const toFins = spot.from[0] < 0 ? 1 : -1;
      copies(blower.group, 6, M.steel, (dummy, k) => {
        const y = (k < 3 ? -1 : 1) * (Math.min(size, part.width) / 2 + 0.8);
        if (k % 3 < 2) {
          dummy.position.set((k % 3 ? 1 : -1) * size * 0.3, y, toFins * 3.5);
          dummy.scale.set(1.2, 1.2, deep + 7);
        } else {
          dummy.position.set(0, y, toFins * (deep / 2 + 6.5));
          dummy.scale.set(size * 0.6, 1.2, 1.2);
        }
      });
    }
    // Under a lid the fan between the towers hangs just below it; otherwise fans sit level with the top
    const z = between && covered ? part.height - COVER - 2 - size / 2 : part.height - 4 - size / 2;
    return { ...spot, blower, z };
  });

  const screws = [screw(group, 0, 46, 18), screw(group, 0, -46, 18)];
  const seat: Travel = {
    seat: [bl.socket.u, -bl.socket.v, bl.socket.top + CPU_HEIGHT],
    hover: [0, 0, 84],
    enter: [0, 0, 230],
  };
  return {
    group,
    frame: 'board',
    duration: 2.5,
    rotors: fans.map((item) => item.blower.rotor),
    glow: [],
    setProgress(p) {
      travel(group, p, seat, 0.4, 0.62, easeInOut);
      screws.forEach((item, i) => driveScrew(item, p, 0.64 + i * 0.06, 0.74 + i * 0.06, 18));
      // The fans travel alongside, then clip onto the fins last.
      const last = look.top === 'hood' ? 0.9 : 0.94;
      fans.forEach((item, i) => {
        const k = 1 - push(seg(p, 0.78 + i * 0.05, last - 0.05 + i * 0.05));
        item.blower.group.position.set(item.x + item.from[0] * k, dy + item.from[1] * k, item.z + item.from[2] * k);
      });
      hood.position.z = part.height + 170 * (1 - push(seg(p, 0.86, 1)));
    },
  };
}

/** Where the radiator sits, and the corner its hoses leave from. */
function radiatorPlace(part: LiquidCoolerPart, lay: CaseLayout, mount: 'top' | 'front') {
  const { length, width, thickness } = part.radiator;
  const zc = lay.W / 2 - PANEL - 2 - width / 2;
  if (mount === 'top') {
    const x = Math.min(lay.frontInner - 10 - length / 2, lay.rearInner + 12 + length / 2 + 40);
    const y = lay.H - PANEL - thickness / 2;
    return {
      centre: [x, y, zc] as [number, number, number],
      size: [length, thickness, width] as [number, number, number],
      along: 'x' as const,
      fanCentre: (i: number): [number, number, number] =>
        [x - length / 2 + (length * (i + 0.5)) / part.fans, y - thickness / 2 - 12.5, zc],
      port: [x - length / 2 + 14, y - thickness / 2 - 4, zc] as [number, number, number],
    };
  }
  const x = lay.frontInner - 27 - thickness / 2;
  const top = lay.H - PANEL - 10;
  const y = top - length / 2;
  return {
    centre: [x, y, zc] as [number, number, number],
    size: [thickness, length, width] as [number, number, number],
    along: 'y' as const,
    fanCentre: (i: number): [number, number, number] =>
      [x - thickness / 2 - 12.5, top - (length * (i + 0.5)) / part.fans, zc],
    port: [x - thickness / 2 - 4, top - 16, zc] as [number, number, number],
  };
}

/** A rectangle with its corners rounded off, for pump housings. */
function roundedRect(w: number, h: number, r: number): [number, number][] {
  const points: [number, number][] = [];
  for (const [cx, cy, start] of [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 1], [-w / 2 + r, -h / 2 + r, 2], [w / 2 - r, -h / 2 + r, 3]]) {
    for (let k = 0; k <= 4; k++) {
      const angle = ((start + k / 4) * Math.PI) / 2;
      points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
  }
  return points;
}

export function buildLiquidCooler(
  part: LiquidCoolerPart,
  lay: CaseLayout,
  bl: BoardLayout,
  mount: 'top' | 'front',
): PartModel {
  const group = new Group();
  const look = part.look ?? { block: 'round' as const, blockSize: 68, cap: 'disc' as const, hose: 11, blades: 7 };
  const size = look.blockSize;
  const cpuTop: [number, number, number] = [
    lay.board.x + bl.socket.u,
    lay.board.y - bl.socket.v,
    lay.board.z + bl.socket.top + CPU_HEIGHT,
  ];

  // Pump block: a cold plate, the housing, and a cap that lights
  const block = new Group();
  const rotors: Object3D[] = [];
  box(block, 46, 46, 6, M.copper, 0, 0, 3);
  const cap = glowMat(0x3a3e45, 0xffffff);
  const tall = part.height - 6;
  const vaned = look.cap === 'vanes';
  // A vaned cap is a wide head on a narrower body; the hoses leave from that body
  const waist = vaned ? size * 0.3 : size / 2;
  if (vaned) {
    const head = tall * 0.42;
    cyl(block, waist, tall - head, M.gpuShroud, 'z', 0, 0, 6 + (tall - head) / 2);
    for (let i = 0; i < 4; i++) {
      const angle = Math.PI / 4 + (i * Math.PI) / 2;
      box(block, 5, 5, tall - head, M.gpuShroud, Math.cos(angle) * size * 0.4, Math.sin(angle) * size * 0.4, 6 + (tall - head) / 2);
    }
    if (look.block === 'round') cyl(block, size / 2, head, M.gpuShroud, 'z', 0, 0, part.height - head / 2);
    else prism(block, roundedRect(size, size, size * 0.2), head, M.gpuShroud, 0, 0, part.height - head);
    // Radial vanes between the rim and the middle disc, over a small fan
    ring(block, size / 2, size / 2 - 4, 1.4, M.gpuShroud, 0, 0, part.height);
    const vanes = 30;
    copies(block, vanes, M.fanFrame, (dummy, i) => {
      const angle = (i / vanes) * Math.PI * 2;
      dummy.position.set(Math.cos(angle) * size * 0.36, Math.sin(angle) * size * 0.36, part.height + 0.5);
      dummy.rotation.z = angle + 0.35;
      dummy.scale.set(size * 0.2, 1, 1.2);
    });
    cyl(block, size * 0.25, 1.6, cap, 'z', 0, 0, part.height + 0.8);
  } else {
    if (look.block === 'round') cyl(block, size / 2, tall, M.gpuShroud, 'z', 0, 0, 6 + tall / 2);
    else prism(block, roundedRect(size, size, size * 0.22), tall, M.gpuShroud, 0, 0, 6);
    // A flat disc let into the top
    ring(block, size * 0.41, size * 0.37, 0.8, M.slotAlt, 0, 0, part.height);
    cyl(block, size * 0.37, 0.8, cap, 'z', 0, 0, part.height + 0.4);
  }
  // Hoses leave low on the side that faces the front of the case, through right-angle fittings
  const hoseR = look.hose / 2;
  const hoseZ = Math.max(12, part.height * 0.27);
  const reach = size / 2 + (vaned ? 9 : 0);
  if (vaned) box(block, reach - waist + 4, 34, 16, M.gpuShroud, (waist + reach) / 2, 0, hoseZ);
  for (const side of [-12, 12]) {
    cyl(block, hoseR + 2.5, 8, M.steel, 'x', reach + 3, side, hoseZ, true);
    cyl(block, hoseR + 1, 8, M.steel, 'x', reach + 9, side, hoseZ, true);
  }
  const hold = look.block === 'round' ? size * 0.27 : size / 2 - 7;
  const screws = [[hold, hold], [hold, -hold], [-hold, hold], [-hold, -hold]].map(([x, y]) => screw(block, x, y, 7, 2.4));
  group.add(block);

  // Radiator: the finned core between a tank at each end, and its fans
  const place = radiatorPlace(part, lay, mount);
  const rad = new Group();
  box(rad, place.size[0], place.size[1], place.size[2], M.radiator, ...place.centre);
  for (const end of [-1, 1]) {
    const tank: [number, number, number] = [...place.size];
    const at: [number, number, number] = [...place.centre];
    if (place.along === 'x') {
      tank[0] = 16; tank[1] += 2; tank[2] += 2;
      at[0] += end * (place.size[0] / 2 - 8);
    } else {
      tank[1] = 16; tank[0] += 2; tank[2] += 2;
      at[1] += end * (place.size[1] / 2 - 8);
    }
    box(rad, tank[0], tank[1], tank[2], M.heatsinkDark, ...at);
  }
  // The core's channels, seen on the face away from the fans
  const coreLen = part.radiator.length - 40;
  const channels = Math.floor(coreLen / 9);
  copies(rad, channels, M.vent, (dummy, i) => {
    const along = (i - (channels - 1) / 2) * 9;
    if (place.along === 'x') {
      dummy.position.set(place.centre[0] + along, place.centre[1] + place.size[1] / 2 + 0.1, place.centre[2]);
      dummy.scale.set(5.5, 0.5, place.size[2] - 12);
    } else {
      dummy.position.set(place.centre[0] + place.size[0] / 2 + 0.1, place.centre[1] + along, place.centre[2]);
      dummy.scale.set(0.5, 5.5, place.size[2] - 12);
    }
  });
  for (let i = 0; i < part.fans; i++) {
    const blower = fan(rad, part.fanSize, 25, look.blades);
    if (place.along === 'x') blower.group.rotation.x = Math.PI / 2;
    else blower.group.rotation.y = -Math.PI / 2;
    blower.group.position.set(...place.fanCentre(i));
    rotors.push(blower.rotor);
  }
  group.add(rad);

  // Two hoses from the block to the radiator
  const hoses: Mesh[] = [-12, 12].map((dz) => {
    const start: [number, number, number] = [cpuTop[0] + reach + 12, cpuTop[1] + dz, cpuTop[2] + hoseZ];
    const end: [number, number, number] = [place.port[0], place.port[1], place.port[2] + dz];
    const lift = Math.max(start[2], end[2]) + 26;
    return tube(group, [
      start,
      [start[0] + 22, start[1], start[2] + 10],
      [(start[0] + end[0]) / 2 + 20, (start[1] + end[1]) / 2, lift],
      [end[0], end[1] - 14, end[2] + 6],
      end,
    ], hoseR, M.hose);
  });

  return {
    group,
    frame: 'case',
    duration: 3.2,
    rotors,
    glow: [cap],
    ghostTargets: [block, rad],
    setProgress(p) {
      const enter = (1 - easeOut(seg(p, 0, HOVER))) * 200;
      block.position.set(cpuTop[0], cpuTop[1], cpuTop[2] + enter + 80 * (1 - easeInOut(seg(p, 0.38, 0.54))));
      screws.forEach((item, i) => driveScrew(item, p, 0.55 + i * 0.02, 0.63 + i * 0.02, 7));
      rad.position.set(0, 0, enter + 150 * (1 - push(seg(p, 0.5, 0.8))));
      const drawn = seg(p, 0.82, 0.99);
      hoses.forEach((hose) => reveal(hose, drawn));
    },
  };
}

/** The side outline of a memory module's heat spreader: along its length, up its height. */
function spreaderOutline(length: number, bottom: number, top: number, style: NonNullable<RamPart['look']>['top']): [number, number][] {
  const half = length / 2;
  if (style === 'angled') {
    return [[-half, bottom], [half, bottom], [half, top - 11], [half - 20, top], [-half + 34, top], [-half, top - 5]];
  }
  if (style === 'peaked') {
    // Low ends, sloped shoulders, a raised flat middle.
    return [
      [-half, bottom], [half, bottom], [half, top - 9], [half - 12, top - 9], [half - 34, top],
      [-half + 34, top], [-half + 12, top - 9], [-half, top - 9],
    ];
  }
  if (style === 'fins') {
    // A comb of teeth along the top edge.
    const points: [number, number][] = [[-half, bottom], [half, bottom], [half, top - 6]];
    const teeth = 11;
    const pitch = (length - 8) / teeth;
    for (let i = 0; i < teeth; i++) {
      const right = half - 4 - i * pitch;
      points.push([right, top - 6], [right, top], [right - pitch * 0.55, top], [right - pitch * 0.55, top - 6]);
    }
    points.push([-half, top - 6]);
    return points;
  }
  const lid = style === 'lightbar' ? top - 7 : top;
  return [[-half, bottom], [half, bottom], [half, lid - 4], [half - 4, lid], [-half + 4, lid], [-half, lid - 4]];
}

export function buildRam(part: RamPart, bl: BoardLayout, fx: Fixtures): PartModel {
  const group = new Group();
  const { dimm } = bl;
  const style = part.look?.top ?? 'flat';
  const shell = part.ramType === 'DDR5' ? M.ramBlack : M.ramGrey;
  const bar = glowMat(0xd9dde2, 0xffffff);
  const slots = part.modules > 2 ? dimm.u.map((_, i) => i) : dimm.pair.slice(0, part.modules);
  const top = 3 + part.height;
  const outline = prismGeometry(spreaderOutline(133.35, 9, top, style), 7);
  const sticks: Group[] = slots.map((index) => {
    const stick = new Group();
    stick.position.set(dimm.u[index], -(dimm.v0 + dimm.len / 2), 0);
    // The module's own board, and its gold edge split by the key notch
    box(stick, 1.4, 133.35, 7, M.pcb, 0, 0, 8.5);
    box(stick, 1.5, 62, 4, M.gold, 0, 33.5, 5);
    box(stick, 1.5, 60, 4, M.gold, 0, -34.5, 5);
    const spreader = new Mesh(outline, shell);
    spreader.quaternion.setFromRotationMatrix(ALONG_X);
    spreader.position.x = -3.5;
    stick.add(spreader);
    if (style === 'lightbar') box(stick, 6, 129, 7, bar, 0, 0, top - 3.5);
    else box(stick, 2.4, 96, 1, bar, 0, 0, top + 0.5);
    // A recessed band along each face
    for (const side of [-1, 1]) box(stick, 0.5, 104, (top - 16) * 0.45, M.slotAlt, side * 3.6, 0, 9 + (top - 16) * 0.5);
    group.add(stick);
    return stick;
  });
  const each = 0.3 / sticks.length;

  return {
    group,
    frame: 'board',
    duration: 2.1,
    rotors: [],
    glow: [bar],
    ghostTargets: sticks,
    setProgress(p, drive) {
      group.position.set(0, 0, (1 - easeOut(seg(p, 0, HOVER))) * 230);
      sticks.forEach((stick, i) => {
        stick.position.z = 56 * (1 - push(seg(p, 0.4 + i * each, 0.56 + i * each + 0.08)));
      });
      if (drive) fx.dimm(easeInOut(seg(p, 0.05, 0.3)) * (1 - seg(p, 0.86, 0.92)));
    },
  };
}

export function buildM2(part: StoragePart, bl: BoardLayout, slot: number, fx: Fixtures): PartModel {
  const group = new Group();
  const spot = bl.m2[Math.min(slot, bl.m2.length - 1)];
  // The drive is drawn lying toward +x from its connector; a socket that faces the other way turns it round
  const turned = new Group();
  if (spot.dir === -1) turned.rotation.z = Math.PI;
  group.add(turned);
  const drive = new Group();
  const len = part.length;
  // The board, with the key notch at the connector end and the half-round screw notch at the other
  const notch = circle(2.8, 16, len, 0).filter(([x]) => x < len - 0.01).sort((a, b) => a[1] - b[1]);
  prism(drive, [
    [0, -11], [len, -11], [len, -2.8], ...(notch as [number, number][]), [len, 2.8], [len, 11], [0, 11],
    [0, 6.2], [3.2, 6.2], [3.2, 4.6], [0, 4.6],
  ], 0.8, M.pcb);
  box(drive, 3.4, 15, 0.9, M.gold, 1.5, -3.2, 0.45);
  box(drive, 3.4, 3.4, 0.9, M.gold, 1.5, 8.6, 0.45);
  box(drive, 11, 11, 1.1, M.chip, 15, 0, 1.35);
  box(drive, 13, 16, 1.1, M.chip, 34, 0, 1.35);
  box(drive, 13, 16, 1.1, M.chip, 52, 0, 1.35);
  if (len > 70) box(drive, 6, 9, 1, M.chip, 66, 2, 1.3);
  box(drive, len - 20, 19, 0.25, M.label, len / 2 - 3, 0, 2.0);
  turned.add(drive);
  const pin = screw(turned, len, 0, 0.8, 2.6);

  const seat: Travel = { seat: [spot.u, -spot.v, bl.m2z + (spot.rise ?? 0)], hover: [0, 0, 50], enter: [0, 0, 220] };
  return {
    group,
    frame: 'board',
    duration: 2.1,
    rotors: [],
    glow: [],
    setProgress(p, operate) {
      travel(group, p, seat, 0.4, 0.58, easeInOut);
      // Goes in at an angle, slides into the connector, then is pressed flat.
      drive.rotation.y = -0.38 * (1 - easeInOut(seg(p, 0.62, 0.76)));
      drive.position.x = 7 * (1 - easeInOut(seg(p, 0.5, 0.62)));
      driveScrew(pin, p, 0.76, 0.9, 0.8);
      // A socket's heatsink is swung up out of the way first, and back down last.
      if (operate) fx.m2(slot, openShut(p, 0.03, 0.28, 0.9, 1));
    },
  };
}

/** A 2.5-inch drive lying on a mount on top of the shroud. */
export function buildDrive25(part: StoragePart, lay: CaseLayout, bay: number): PartModel {
  const group = new Group();
  // Lying flat: length along x, 69.85 mm across, 7 mm thick, corners cut
  const body = prism(group, chamfered(part.length, 69.85, 3), 7, M.heatsinkDark, 0, 0, 0);
  body.rotation.x = -Math.PI / 2;
  box(group, part.length - 24, 0.4, 44, M.labelDim, -4, 7.1, 3);
  // The SATA data and power connectors on the edge that faces the tray
  box(group, 8, 3.4, 4, M.slot, -14, 3, -36);
  box(group, 19, 3.4, 4, M.slot, 4, 3, -36);
  const screws = [screw(group, -36, 7, 0, 2.2), screw(group, 36, 7, 0, 2.2)];
  screws.forEach((item) => { item.rotation.x = -Math.PI / 2; });

  const spot = lay.bays[Math.min(bay, lay.bays.length - 1)] ?? { x: 0, y: lay.shroudTopY, z: 30 };
  const seat: Travel = { seat: [spot.x, spot.y, spot.z], hover: [0, 22, 120], enter: [0, 10, 170] };
  return {
    group,
    frame: 'case',
    duration: 1.8,
    rotors: [],
    glow: [],
    setProgress(p) {
      travel(group, p, seat, 0.4, 0.7, easeInOut);
      screws.forEach((item, i) => {
        const t = seg(p, 0.74 + i * 0.1, 0.88 + i * 0.1);
        item.visible = t > 0;
        item.position.y = 7 + (1 - easeOut(t)) * 22;
        item.rotation.y = (1 - easeOut(t)) * 12;
      });
    },
  };
}

type GpuLook = NonNullable<GpuPart['look']>;

/** How far up from the slot a card's own circuit board reaches; the cooler may stand taller. */
const GPU_BASE = 13;
const GPU_PCB_TOP = GPU_BASE + 98;

/** A card's drawing details. One the catalog says nothing about gets a plain cooler of its size. */
function gpuLook(part: GpuPart): GpuLook {
  if (part.look) return part.look;
  const plugs = part.connectors.pcie8 + part.connectors.hpwr16;
  return {
    fanSizes: Array<number>(part.fans).fill(Math.min(part.height - 17, (part.length - 23) / part.fans - 4)),
    blades: 9,
    fanRing: 'none',
    pcb: Math.min(part.length - 12, 230),
    finish: { shroud: 'black', back: 'grey' },
    backplate: part.length > 250 ? { open: 'bars', from: 0.84, to: 0.97, span: 0.8 } : { open: 'closed', from: 0, to: 0, span: 0 },
    shroud: { cut: 0, corners: 'tail', pattern: 'plain', wrap: 0.34 },
    edge: { fins: [[0.04, 0.96]] },
    power: { at: part.length - 70 - 11 * (plugs - 1), recessed: false },
    lights: { edge: [0.15, 0.45] },
    tail: 'closed',
    bracket: 'slots',
  };
}

/** Where a graphics card's power sockets are, relative to its own origin. */
export function gpuPlugSpots(part: GpuPart, bl: BoardLayout): [number, number, number][] {
  const x0 = -(bl.pcie.rows[0].u + 10);
  const look = gpuLook(part);
  const plugs = part.connectors.pcie8 + part.connectors.hpwr16;
  const edge = GPU_BASE + part.height - 9;
  const z = look.power.recessed ? Math.min(edge, GPU_PCB_TOP) : edge;
  return Array.from({ length: plugs }, (_, i) => [
    x0 + look.power.at + ((plugs - 1) / 2 - i) * 22,
    -6,
    z + 1.5,
  ]);
}

/** A flat plate lying in the card's x-z plane, its upper face at `y`. The outline is drawn in (x, z). */
function slab(
  parent: Object3D,
  outline: [number, number][],
  thickness: number,
  material: Material,
  y: number,
  holes: [number, number][][] = [],
): Mesh {
  const mesh = prism(parent, outline, thickness, material, 0, y, 0, holes);
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

/** The parts of [from, to] that none of `gaps` cover. */
function between(from: number, to: number, gaps: [number, number][]): [number, number][] {
  const sorted = [...gaps].sort((a, b) => a[0] - b[0]);
  const kept: [number, number][] = [];
  let at = from;
  for (const [g0, g1] of sorted) {
    if (g0 > at) kept.push([at, Math.min(g0, to)]);
    at = Math.max(at, g1);
    if (at >= to) break;
  }
  if (at < to) kept.push([at, to]);
  return kept.filter(([a, b]) => b - a > 1);
}

/** The vent holes in the rows of a card's bracket that carry no ports, on both of its faces. */
function bracketVents(group: Group, style: GpuLook['bracket'], x0: number, rows: number): void {
  if (rows < 2) return;
  const per = style === 'rounds' ? 48 : style === 'mesh' ? 80 : style === 'truss' ? 7 : style === 'slants' ? 12 : 8;
  const token = style === 'rounds' || style === 'mesh' ? 'hex' : style === 'truss' ? 'tri' : 'box';
  copies(group, (rows - 1) * per * 2, M.vent, (dummy, i) => {
    const face = i % 2 ? x0 + 1.75 : x0 - 0.25;
    const k = Math.floor(i / 2) % per;
    const y = -4 - (Math.floor(i / 2 / per) + 1) * 20.32;
    if (style === 'slots') {
      dummy.position.set(face, y, 23 + k * 10.4);
      dummy.scale.set(0.5, 12, 6.4);
    } else if (style === 'slants') {
      dummy.position.set(face, y, 25 + Math.floor(k / 3) * 21 + (k % 3) * 5.4);
      dummy.rotation.x = 0.5;
      dummy.scale.set(0.5, 13, 2.8);
    } else if (style === 'truss') {
      dummy.position.set(face, y + (k % 2 ? 1.6 : -1.6), 26 + k * 11.2);
      dummy.rotation.set(k % 2 ? Math.PI / 2 : -Math.PI / 2, 0, Math.PI / 2);
      dummy.scale.set(12, 0.5, 12);
    } else {
      const across = style === 'rounds' ? 3 : 4;
      const [col, line] = [k % across, Math.floor(k / across)];
      const pitch = style === 'rounds' ? 4.8 : 3.9;
      dummy.position.set(face, y + (col - (across - 1) / 2) * pitch * 0.9, 22 + line * pitch + (col % 2 ? pitch / 2 : 0));
      dummy.rotation.set(style === 'mesh' ? Math.PI / 6 : 0, 0, Math.PI / 2);
      dummy.scale.set(pitch * 0.72, 0.5, pitch * 0.72);
    }
  }, token);
}

export function buildGpu(part: GpuPart, bl: BoardLayout, fx: Fixtures): PartModel {
  const group = new Group();
  const look = gpuLook(part);
  const row = bl.pcie.rows[0];
  const x0 = -(row.u + 10); // bracket sits against the rear panel
  const top = 3;
  const zBase = GPU_BASE;
  const zLen = part.height - 9;
  const zTop = zBase + zLen;
  const bodyLen = part.length - 3;
  const xA = x0 + 3;
  const xB = xA + bodyLen;
  const at = (fraction: number): number => xA + bodyLen * fraction;
  const midZ = zBase + zLen / 2;
  const bottom = top - part.thickness;
  const pcbTop = Math.min(zTop, GPU_PCB_TOP);
  const pcbLen = Math.min(look.pcb, part.length) - 5;
  const pcbEnd = xA + pcbLen;
  const plugs = gpuPlugSpots(part, bl);
  const tone = { black: M.gpuShroud, grey: M.gpuBack, silver: M.alu };
  const shell = tone[look.finish.shroud];

  // Corners cut off the cooler: how much of the height is lost at x
  const cut = Math.min(look.shroud.cut, zLen / 2 - 6);
  const cutA = look.shroud.corners === 'all' ? cut : 0;
  const trim = (x: number): number => Math.max(0, cut - (xB - x), cutA - (x - xA));

  // Where the power sockets sit below the top edge, everything above them is cut away
  const sunk = look.power.recessed && zTop - pcbTop > 6 && plugs.length > 0;
  const notch = sunk
    ? { x0: Math.min(...plugs.map((spot) => spot[0])) - 15, x1: Math.max(...plugs.map((spot) => spot[0])) + 15 }
    : null;

  // The backplate: open past the end of the board on cards that blow straight
  // through, and with a window round the bracket behind the chip on many
  const back: [number, number][] = [[xA, zBase], [xB, zBase], [xB, zTop]];
  if (notch) back.push([notch.x1, zTop], [notch.x1, pcbTop + 3], [notch.x0, pcbTop + 3], [notch.x0, zTop]);
  back.push([xA, zTop]);
  const holes: [number, number][][] = [];
  const { open, span } = look.backplate;
  const [cut0, cut1] = [Math.max(at(look.backplate.from), pcbEnd + 3), Math.min(at(look.backplate.to), xB - 5)];
  const [cutZ0, cutZ1] = [midZ - (zLen * span) / 2, midZ + (zLen * span) / 2];
  if (open !== 'closed' && cut1 - cut0 > 12) {
    if (open === 'window') {
      holes.push([[cut0, cutZ0], [cut0, cutZ1], [cut1, cutZ1], [cut1, cutZ0]]);
    } else if (open === 'bars') {
      // Slanted slots with bars left between them
      const lean = Math.min(10, (cutZ1 - cutZ0) * 0.14);
      const count = Math.max(1, Math.floor((cut1 - cut0 - lean + 6) / 18));
      const wide = (cut1 - cut0 - lean - (count - 1) * 6) / count;
      for (let i = 0; i < count; i++) {
        const x = cut0 + i * (wide + 6);
        holes.push([[x, cutZ0], [x + lean, cutZ1], [x + lean + wide, cutZ1], [x + wide, cutZ0]]);
      }
    } else {
      const [cols, lines] = [Math.floor((cut1 - cut0) / 7), Math.floor((cutZ1 - cutZ0) / 6.2)];
      copies(group, cols * lines, M.vent, (dummy, i) => {
        const [col, line] = [i % cols, Math.floor(i / cols)];
        dummy.position.set(cut0 + 7 * (col + (line % 2 ? 0.75 : 0.25)), top + 0.1, cutZ0 + 6.2 * (line + 0.5));
        dummy.scale.set(5.6, 0.5, 5.6);
      }, 'hex');
    }
  }
  const chip = look.backplate.chip;
  if (chip) {
    const [cx, cz] = [at(chip.at), zBase + Math.min(zLen, 98) * 0.45];
    const half = chip.size / 2;
    if (chip.cross) {
      const arm = chip.size * 0.24;
      holes.push([
        [cx - arm, cz - half], [cx - arm, cz - arm], [cx - half, cz - arm], [cx - half, cz + arm], [cx - arm, cz + arm], [cx - arm, cz + half],
        [cx + arm, cz + half], [cx + arm, cz + arm], [cx + half, cz + arm], [cx + half, cz - arm], [cx + arm, cz - arm], [cx + arm, cz - half],
      ]);
    } else {
      const tall = half * 0.77;
      holes.push([[cx - half + 4, cz - tall], [cx - half, cz - tall + 4], [cx - half, cz + tall - 4], [cx - half + 4, cz + tall], [cx + half - 4, cz + tall], [cx + half, cz + tall - 4], [cx + half, cz - tall + 4], [cx + half - 4, cz - tall]]);
    }
    // The spring bracket that clamps the cooler to the chip, seen through that window
    const plate = box(group, chip.size * 0.5, 0.8, chip.size * 0.5, M.steel, cx, top - 2.2, cz);
    plate.rotation.y = Math.PI / 4;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) cyl(group, 2, 1.2, M.screw, 'y', cx + dx * chip.size * 0.3, top - 1.9, cz + dz * chip.size * 0.3, true);
  }
  slab(group, back, 1.6, tone[look.finish.back], top, holes);

  // The circuit board and the edge that goes into the slot
  box(group, pcbLen, 1.6, pcbTop - zBase, M.pcb, xA + pcbLen / 2, -0.2, (zBase + pcbTop) / 2);
  box(group, bl.pcie.len, 1.6, 9, M.gold, bl.pcie.len / 2, 0, 8.5);

  // Fins from the board down to the fans; past the board they fill the whole thickness
  const fanDepth = Math.max(8, Math.min(15, part.thickness * 0.22));
  const finFloor = bottom + 3 + fanDepth + 1;
  const finCount = Math.floor((bodyLen - 14) / 5);
  copies(group, finCount, M.heatsink, (dummy, i) => {
    const x = xA + 8 + i * 5;
    const ceiling = x > pcbEnd + 2 ? top - 2 : -2;
    const low = notch && x > notch.x0 && x < notch.x1;
    const [z0, z1] = [zBase + 2 + trim(x), (low ? pcbTop - 1 : zTop - 2) - trim(x)];
    dummy.position.set(x, (ceiling + finFloor) / 2, (z0 + z1) / 2);
    dummy.scale.set(0.8, ceiling - finFloor, z1 - z0);
  });

  // The shroud: a face plate with an opening for each fan, and walls that wrap the long edges
  const sizes = look.fanSizes.length ? look.fanSizes : gpuLook({ ...part, look: undefined }).fanSizes;
  const fit = Math.min(1, (bodyLen - 8 - 3 * (sizes.length + 1)) / sizes.reduce((sum, size) => sum + size, 0), (zLen - 5) / Math.max(...sizes));
  const fans = sizes.map((size) => size * fit);
  const gap = (bodyLen - 8 - fans.reduce((sum, size) => sum + size, 0)) / (fans.length + 1);
  const centres: number[] = [];
  fans.reduce((x, size) => { centres.push(x + gap + size / 2); return x + gap + size; }, xA + 4);

  const face: [number, number][] = [
    [xA + cutA, zBase], [xB - cut, zBase], [xB, zBase + cut], [xB, zTop - cut],
    [xB - cut, zTop], [xA + cutA, zTop], [xA, zTop - cutA], [xA, zBase + cutA],
  ];
  slab(group, face, 3, shell, bottom + 3, fans.map((size, i) => circle(size / 2 + 1, 36, centres[i], midZ).reverse() as [number, number][]));
  const wrap = Math.max(6, part.thickness * look.shroud.wrap);
  const wallY = bottom + wrap / 2;
  const [wall0, wall1] = [xA + cutA, xB - cut];
  for (const z of [zTop - 1, zBase + 1]) box(group, wall1 - wall0, wrap, 2, shell, (wall0 + wall1) / 2, wallY, z);
  box(group, 2, wrap, zLen - 2 * cutA, shell, xA + 1, wallY, midZ);
  for (const [size, x, lean] of [[cut, xB - cut / 2 - 0.7, 1], [cutA, xA + cutA / 2 + 0.7, -1]]) {
    if (size <= 0) continue;
    for (const side of [-1, 1]) {
      const slope = box(group, size * Math.SQRT2, wrap, 2, shell, x, wallY, side > 0 ? zTop - size / 2 - 0.7 : zBase + size / 2 + 0.7);
      slope.rotation.y = side * lean * (Math.PI / 4);
    }
  }
  // Above the shroud's wall the edge facing the window is solid except where the fins show
  const rail = top - 1.6 - (bottom + wrap);
  if (rail > 3) {
    const shown: [number, number][] = look.edge.fins.map(([from, to]) => [at(from), at(to)]);
    if (notch) shown.push([notch.x0, notch.x1]);
    for (const [from, to] of between(wall0, wall1, shown)) {
      box(group, to - from, rail, 2, shell, (from + to) / 2, bottom + wrap + rail / 2, zTop - 1);
    }
  }
  if (look.edge.plate) {
    const [from, to] = [at(look.edge.plate[0]), at(look.edge.plate[1])];
    box(group, to - from, Math.min(wrap * 0.62, 16), 1.2, M.slotAlt, (from + to) / 2, bottom + wrap * 0.5, zTop + 0.6);
  }

  // The end away from the bracket
  const tailLen = zLen - 2 * cut;
  if (look.tail === 'cage') {
    // The backplate folds down over the end; fins show between it and the shroud
    box(group, 2, part.thickness * 0.34, tailLen, tone[look.finish.back], xB - 1, top - part.thickness * 0.17, midZ);
    box(group, 2, wrap, tailLen, shell, xB - 1, wallY, midZ);
    for (const side of [-1, 1]) box(group, 2, part.thickness - 2, 5, shell, xB - 1, (top + bottom) / 2, midZ + side * (tailLen / 2 - 2.5));
  } else {
    box(group, 2, part.thickness - 2, tailLen, shell, xB - 1, bottom + (part.thickness - 2) / 2, midZ);
    if (look.tail === 'louvres') {
      const slats = Math.floor((part.thickness - 16) / 6.5);
      copies(group, slats, M.vent, (dummy, i) => {
        dummy.position.set(xB + 0.1, (top + bottom) / 2 + (i - (slats - 1) / 2) * 6.5, midZ);
        dummy.scale.set(0.5, 3.2, tailLen - 18);
      });
    }
  }

  // How the face is broken up between and around the fans
  const pattern = look.shroud.pattern;
  // Marks in the spandrels between neighbouring fans, and across the four corners
  const seams = centres.slice(1).map((centre, i) => (centres[i] + fans[i] / 2 + centre - fans[i + 1] / 2) / 2);
  if (pattern === 'wedges' || pattern === 'stripes') {
    const ribs = pattern === 'wedges';
    const marks: { x: number; z: number; turn: number; long: number }[] = [];
    for (const side of [-1, 1]) {
      const z = midZ + side * (zLen / 2 - Math.min(16, zLen * 0.14));
      for (const x of seams) {
        if (ribs) for (const lean of [-1, 1]) marks.push({ x: x + lean * 5, z, turn: lean * side * 0.55, long: Math.min(26, zLen * 0.22) });
        else for (const k of [-1, 0, 1]) marks.push({ x: x + k * 5, z, turn: 0.4, long: Math.min(24, zLen * 0.2) });
      }
      for (const end of [-1, 1]) {
        const inset = fans[end < 0 ? 0 : fans.length - 1] * 0.13 + (end < 0 ? cutA : cut) * 0.5 + 2;
        const [x, zc] = [end < 0 ? xA + inset : xB - inset, midZ + side * (zLen / 2 - inset)];
        for (const k of ribs ? [0] : [-1, 0, 1]) {
          marks.push({ x: x + k * 3.2 * end, z: zc - k * 3.2 * side, turn: end * side * (Math.PI / 4), long: 13 });
        }
      }
    }
    copies(group, marks.length, ribs ? shell : M.vent, (dummy, i) => {
      const mark = marks[i];
      dummy.position.set(mark.x, bottom - (ribs ? 0.7 : 0.1), mark.z);
      dummy.rotation.y = mark.turn;
      dummy.scale.set(ribs ? 2.4 : 1.6, ribs ? 1.4 : 0.5, mark.long);
    });
  } else if (pattern === 'lines') {
    // Thin straight lines that divide the face into panels
    copies(group, seams.length + 1, M.vent, (dummy, i) => {
      if (i < seams.length) {
        dummy.position.set(seams[i], bottom - 0.1, midZ);
        dummy.scale.set(0.8, 0.5, zLen - 6);
      } else {
        dummy.position.set((wall0 + wall1) / 2, bottom - 0.1, zTop - Math.min(12, zLen * 0.1));
        dummy.scale.set(wall1 - wall0 - 8, 0.5, 0.8);
      }
    });
  }

  // The rear bracket: one slot width per row, vented, with its tab folded over the case
  const rows = Math.ceil(part.slots);
  const bracketH = rows * 20.32 - 2;
  box(group, 1.5, bracketH, 118, M.steel, x0 + 0.75, 6 - bracketH / 2, 56);
  box(group, 12, bracketH, 1.5, M.steel, x0 + 6, 6 - bracketH / 2, 115.5);
  // The row over the slot carries the display outputs, seen from behind the
  // case; any rows beyond it are vented.
  const outputs = part.outputs ?? { dp: 3, hdmi: 1 };
  const sockets: ('dp' | 'hdmi')[] = [...Array(outputs.hdmi).fill('hdmi'), ...Array(outputs.dp).fill('dp')];
  const outPitch = Math.min(22, 92 / Math.max(1, sockets.length));
  sockets.forEach((kind, i) => {
    const z = 100 - outPitch * (i + 0.5);
    const [wide, tall] = kind === 'dp' ? [16, 4.8] : [14.4, 5.2];
    box(group, 12, tall + 2.4, wide + 2.4, M.steel, x0 + 5, -5, z);
    box(group, 1.2, tall + 1.6, wide + 1.6, M.steel, x0 - 0.5, -5, z);
    box(group, 1.6, tall, wide, M.slot, x0 - 0.6, -5, z);
  });
  bracketVents(group, look.bracket, x0, rows);

  // Fans on the face that looks down, each behind a lip or a raised rim round its opening
  const lit = glowMat(0x9aa0a8, 0xffffff);
  const rotors: Object3D[] = [];
  fans.forEach((size, i) => {
    const cooler = fan(group, size, fanDepth, look.blades, true, look.fanRing);
    cooler.group.rotation.x = Math.PI / 2;
    cooler.group.position.set(centres[i], bottom + 1.5 + fanDepth / 2, midZ);
    rotors.push(cooler.rotor);
    const rim = pattern === 'rims';
    const lip = ring(group, Math.min(size / 2 + (rim ? 7 : 3.5), zLen / 2), size / 2 + 1, rim ? 2.2 : 1.2, look.lights.fans ? lit : shell, centres[i], bottom, midZ);
    lip.rotation.x = Math.PI / 2;
  });

  for (const [x, y, z] of plugs) box(group, part.connectors.hpwr16 ? 15 : 19, 9, 5, M.slot, x, y - 3, z);
  if (look.lights.edge) {
    const [from, to] = [at(look.lights.edge[0]), at(look.lights.edge[1])];
    box(group, to - from, 2.6, 1, lit, (from + to) / 2, bottom + wrap * 0.5, zTop + (look.edge.plate ? 1.4 : 0.3));
  }
  if (look.lights.tail) {
    // A band round the rim of the tail
    for (const side of [-1, 1]) {
      box(group, 3, 1.2, tailLen, lit, xB - 1.5, side > 0 ? top + 0.3 : bottom - 0.3, midZ);
      box(group, 3, part.thickness, 1.2, lit, xB - 1.5, (top + bottom) / 2, midZ + side * (tailLen / 2 + 0.3));
    }
  }

  const seat: Travel = { seat: [row.u, -row.v, 0], hover: [0, 0, 74], enter: [0, 0, 240] };
  return {
    group,
    frame: 'board',
    duration: 2.2,
    rotors,
    glow: look.lights.edge || look.lights.fans || look.lights.tail ? [lit] : [],
    // Fans toward the eye, bracket on the left, as a card is shown on its own
    portrait: [-Math.PI / 2, 0, 0],
    setProgress(p, drive) {
      travel(group, p, seat, 0.4, 0.74, push);
      if (drive) fx.latch(easeInOut(seg(p, 0.05, 0.3)) * (1 - seg(p, 0.76, 0.84)));
    },
  };
}

/** Where cable `index` plugs into the power supply's front face, in the case frame. */
export function psuSocket(part: PsuPart, lay: CaseLayout, index: number): [number, number, number] {
  const body = psuBody(part.formFactor);
  const row = index % 2;
  const col = Math.floor(index / 2);
  return [
    lay.psu.x + part.length,
    lay.psu.y + body.height * (0.3 + row * 0.4),
    lay.psu.z + body.width * (0.16 + col * 0.17),
  ];
}

export function buildPsu(part: PsuPart, lay: CaseLayout): PartModel {
  const group = new Group();
  const len = part.length;
  const { width, height } = psuBody(part.formFactor);
  box(group, len, height, width, M.psu, len / 2, height / 2, width / 2);
  // The side you see: a label plate and a screw in each corner
  box(group, len * 0.5, height * 0.3, 0.5, M.labelDim, len * 0.42, height * 0.58, width + 0.1);
  box(group, len * 0.5, 3, 0.6, M.heatsinkDark, len * 0.42, height * 0.5, width + 0.2);
  for (const [fx, fy] of [[0.06, 0.1], [0.94, 0.1], [0.06, 0.9], [0.94, 0.9]]) {
    cyl(group, 2.2, 1, M.screw, 'z', len * fx, height * fy, width + 0.5, true);
  }
  // The end the cables plug into
  if (part.modular === 'none') {
    cyl(group, 13, 6, M.cable, 'x', len + 3, height * 0.5, width * 0.5, true);
  } else {
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 5; col++) {
        box(group, 0.8, height * 0.15, width * 0.11, M.slot,
          len + 0.2, height * (0.3 + row * 0.4), width * (0.16 + col * 0.17));
      }
    }
  }
  // The face at the back of the case: mains inlet, rocker switch, exhaust
  // grille and the four screws that hold it to the panel
  const rear = part.look ?? { switch: true, grille: 'hex' as const, fan: 120 };
  const inletZ = width * 0.8;
  box(group, 0.8, 22, 30, M.slotAlt, -0.3, height * 0.34, inletZ);
  box(group, 1, 17, 24, M.slot, -0.5, height * 0.34, inletZ);
  for (const dz of [-7, 0, 7]) box(group, 1.6, 7, 2, M.steel, -0.4, height * 0.34 + (dz ? -1.5 : 3), inletZ + dz);
  if (rear.switch) {
    box(group, 0.8, 16, 22, M.slotAlt, -0.3, height * 0.72, inletZ);
    const rocker = box(group, 2.4, 11, 17, M.black, -0.9, height * 0.72, inletZ);
    rocker.rotation.y = 0.12;
  }
  if (rear.grille !== 'none') {
    const [spanZ, spanY] = [width * 0.56, height - 22];
    if (rear.grille !== 'slots') {
      const tri = rear.grille === 'tri';
      const [pz, py] = tri ? [8.4, 7.4] : [9, 7.8];
      const [cols, rowsY] = [Math.floor(spanZ / pz), Math.floor(spanY / py)];
      copies(group, cols * rowsY, M.vent, (dummy, i) => {
        const [col, row] = [i % cols, Math.floor(i / cols)];
        dummy.position.set(-0.2, 11 + py * (row + 0.5), width * 0.06 + pz * (col + (tri ? 0.5 : row % 2 ? 0.75 : 0.25)));
        dummy.rotation.set(tri ? ((col + row) % 2 ? Math.PI / 2 : -Math.PI / 2) : 0, 0, Math.PI / 2);
        dummy.scale.set(tri ? 8 : 7, 0.5, tri ? 8 : 7);
      }, tri ? 'tri' : 'hex');
    } else {
      const rowsY = Math.floor(spanY / 7);
      copies(group, rowsY, M.vent, (dummy, i) => {
        dummy.position.set(-0.2, 11 + 7 * (i + 0.5), width * 0.06 + spanZ / 2);
        dummy.scale.set(0.5, 3.2, spanZ);
      });
    }
  }
  for (const [fz, fy] of [[0.05, 0.08], [0.95, 0.08], [0.05, 0.92], [0.95, 0.92]]) {
    cyl(group, 2.6, 1.4, M.screw, 'x', -0.6, height * fy, width * fz, true);
  }

  // The fan grille on top: rings, spokes and a hub
  const grille = Math.min(rear.fan / 2 + 2, Math.min(len, width) / 2 - 4);
  for (const radius of [1, 0.74, 0.48]) {
    const loop = ring(group, grille * radius, grille * radius - 2.2, 1, M.heatsinkDark, len / 2, height + 1, width / 2);
    loop.rotation.x = -Math.PI / 2;
  }
  for (let i = 0; i < 4; i++) {
    const spoke = box(group, grille * 2, 0.8, 2, M.heatsinkDark, len / 2, height + 0.5, width / 2);
    spoke.rotation.y = (i * Math.PI) / 4;
  }
  cyl(group, grille * 0.26, 1.2, M.fanFrame, 'y', len / 2, height + 0.7, width / 2);

  const seat: Travel = { seat: [lay.psu.x, lay.psu.y, lay.psu.z], hover: [0, 0, 150], enter: [0, 0, 190] };
  return {
    group,
    frame: 'case',
    duration: 1.9,
    rotors: [],
    glow: [],
    setProgress(p) {
      travel(group, p, seat, 0.4, 0.9, easeInOut);
    },
  };
}
