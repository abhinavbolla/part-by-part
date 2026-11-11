// The parts that go into the case. Each is drawn from its catalog dimensions
// and, where the catalog records them, the features you would recognise it
// by: how many heat pipes, what the top of a memory module looks like, where
// a card's fans sit. No logos, and no brand artwork.

import { Group, Mesh, Object3D } from 'three';

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

/** A stack of fins standing on the cooler base, with heat pipes through it. */
function finStack(parent: Object3D, depth: number, width: number, height: number, x: number, pipes: number, cover: boolean): void {
  const base = 34;
  const pitch = 4;
  const top = cover ? height - 6 : height - 3;
  const count = Math.floor((top - base) / pitch);
  copies(parent, count, M.alu, (dummy, i) => {
    dummy.position.set(x, 0, base + i * pitch);
    dummy.scale.set(depth, width, 0.6);
  });
  if (cover) {
    prism(parent, chamfered(depth + 2, width + 2, 5), 5, M.heatsinkDark, x, 0, height - 5);
  } else {
    box(parent, depth, width, 1.4, M.alu, x, 0, top);
  }
  // Each U-shaped pipe passes up through the fins twice, once near each face.
  const pipeLen = (cover ? height - 6 : height) - 9;
  const reach = width / 2 - 14;
  for (let i = 0; i < pipes; i++) {
    const y = pipes === 1 ? 0 : -reach + (2 * reach * i) / (pipes - 1);
    for (const dx of [-depth / 2 + 8, depth / 2 - 8]) {
      cyl(parent, 3, pipeLen, M.steel, 'z', x + dx, y, 8 + pipeLen / 2, true);
    }
  }
}

export function buildAirCooler(part: AirCoolerPart, bl: BoardLayout): PartModel {
  const group = new Group();
  const fanDepth = 25;
  const towers = part.towers;
  const look = part.look ?? { pipes: towers === 2 ? 6 : 4, cover: false, fanFrame: 'square' as const };
  const stack = Math.max(30, (part.depth - fanDepth * part.fans) / towers);

  // Base plate, the bar that clamps it down, and where the pipes bend into the base
  box(group, 42, 40, 9, M.copper, 0, 0, 4.5);
  box(group, 14, 104, 3, M.steel, 0, 0, 10.5);
  box(group, (towers === 2 ? fanDepth + stack : 0) + 30, part.width * 0.62, 12, M.steel, 0, 0, 22);

  // Along x from the front: [fan] tower [fan] tower. A single tower has its fan in front.
  const centres = towers === 2 ? [fanDepth / 2 + stack / 2, -(fanDepth / 2 + stack / 2)] : [0];
  for (const x of centres) finStack(group, stack, part.width, part.height, x, look.pipes, look.cover);

  const fanZ = part.height - 4 - part.fanSize / 2;
  const fanSpots: { x: number; from: [number, number, number] }[] = [];
  if (towers === 2) {
    fanSpots.push({ x: 0, from: [0, 0, 150] });
    if (part.fans > 1) fanSpots.push({ x: fanDepth + stack + 0.5, from: [64, 0, 0] });
  } else {
    fanSpots.push({ x: stack / 2 + fanDepth / 2 + 0.5, from: [64, 0, 0] });
    if (part.fans > 1) fanSpots.push({ x: -(stack / 2 + fanDepth / 2 + 0.5), from: [-64, 0, 0] });
  }
  const fans = fanSpots.map((spot) => {
    const blower = fan(group, part.fanSize, fanDepth, part.fanSize >= 140 ? 9 : 7, look.fanFrame === 'round');
    blower.group.rotation.y = Math.PI / 2;
    return { ...spot, blower };
  });

  const screws = [screw(group, 0, 46, 12), screw(group, 0, -46, 12)];
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
      screws.forEach((item, i) => driveScrew(item, p, 0.64 + i * 0.06, 0.74 + i * 0.06, 12));
      // The fans travel alongside, then clip onto the fins last.
      fans.forEach((item, i) => {
        const k = 1 - push(seg(p, 0.8 + i * 0.05, 0.94 + i * 0.05));
        item.blower.group.position.set(item.x + item.from[0] * k, item.from[1] * k, fanZ + item.from[2] * k);
      });
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

export function buildLiquidCooler(
  part: LiquidCoolerPart,
  lay: CaseLayout,
  bl: BoardLayout,
  mount: 'top' | 'front',
): PartModel {
  const group = new Group();
  const look = part.look ?? { block: 'round' as const, blockFan: false };
  const cpuTop: [number, number, number] = [
    lay.board.x + bl.socket.u,
    lay.board.y - bl.socket.v,
    lay.board.z + bl.socket.top + CPU_HEIGHT,
  ];

  // Pump block: a cold plate, the housing, and a cap that lights
  const block = new Group();
  box(block, 46, 46, 6, M.copper, 0, 0, 3);
  const cap = glowMat(0x3a3e45, 0xffffff);
  if (look.block === 'square') {
    prism(block, chamfered(70, 70, 7), part.height - 6, M.gpuShroud, 0, 0, 6);
    prism(block, chamfered(46, 46, 5), 1.2, cap, 0, 0, part.height);
  } else {
    cyl(block, 34, part.height - 6, M.gpuShroud, 'z', 0, 0, 6 + (part.height - 6) / 2);
    cyl(block, 24, 1.2, cap, 'z', 0, 0, part.height + 0.6);
  }
  if (look.blockFan) ring(block, 21, 15, 2, M.fanFrame, 0, 0, part.height + 1.2);
  // Hose fittings on the side that faces the front of the case
  for (const dy of [-9, 9]) cyl(block, 6.5, 12, M.steel, 'x', 36, dy, part.height * 0.6, true);
  const screws = [[30, 30], [30, -30], [-30, 30], [-30, -30]].map(([x, y]) => screw(block, x, y, 7, 2.4));
  group.add(block);

  // Radiator: the core, a tank at each end, and its fans
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
  const rotors: Object3D[] = [];
  for (let i = 0; i < part.fans; i++) {
    const blower = fan(rad, part.fanSize, 25);
    if (place.along === 'x') blower.group.rotation.x = Math.PI / 2;
    else blower.group.rotation.y = -Math.PI / 2;
    blower.group.position.set(...place.fanCentre(i));
    rotors.push(blower.rotor);
  }
  group.add(rad);

  // Two hoses from the block to the radiator
  const hoses: Mesh[] = [-9, 9].map((dz) => {
    const start: [number, number, number] = [cpuTop[0] + 42, cpuTop[1] + dz, cpuTop[2] + part.height * 0.6];
    const end: [number, number, number] = [place.port[0], place.port[1], place.port[2] + dz];
    const lift = Math.max(start[2], end[2]) + 26;
    return tube(group, [
      start,
      [start[0] + 22, start[1], start[2] + 10],
      [(start[0] + end[0]) / 2 + 20, (start[1] + end[1]) / 2, lift],
      [end[0], end[1] - 14, end[2] + 6],
      end,
    ], 5.5, M.hose);
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

export function buildM2(part: StoragePart, bl: BoardLayout, slot: number): PartModel {
  const group = new Group();
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
  group.add(drive);
  const pin = screw(group, len, 0, 0.8, 2.6);

  const spot = bl.m2[Math.min(slot, bl.m2.length - 1)];
  const seat: Travel = { seat: [spot.u, -spot.v, bl.m2z], hover: [0, 0, 50], enter: [0, 0, 220] };
  return {
    group,
    frame: 'board',
    duration: 2.1,
    rotors: [],
    glow: [],
    setProgress(p) {
      travel(group, p, seat, 0.4, 0.58, easeInOut);
      // Goes in at an angle, slides into the connector, then is pressed flat.
      drive.rotation.y = -0.38 * (1 - easeInOut(seg(p, 0.64, 0.8)));
      drive.position.x = 7 * (1 - easeInOut(seg(p, 0.5, 0.62)));
      driveScrew(pin, p, 0.82, 0.98, 0.8);
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

/** Where a graphics card's power sockets are, relative to its own origin. */
export function gpuPlugSpots(part: GpuPart, bl: BoardLayout): [number, number, number][] {
  const x0 = -(bl.pcie.rows[0].u + 10);
  const plugs = part.connectors.pcie8 + part.connectors.hpwr16;
  return Array.from({ length: plugs }, (_, i) => [
    x0 + part.length - 70 - i * 23,
    -6,
    13 + (part.height - 9) + 1.5,
  ]);
}

export function buildGpu(part: GpuPart, bl: BoardLayout, fx: Fixtures): PartModel {
  const group = new Group();
  const row = bl.pcie.rows[0];
  const x0 = -(row.u + 10); // bracket sits against the rear panel
  const top = 3;
  const zBase = 13;
  const zLen = part.height - 9;
  const bodyLen = part.length - 3;
  const midX = x0 + 3 + bodyLen / 2;
  const midZ = zBase + zLen / 2;
  const bottom = top - part.thickness;
  const midY = (top - 2 + bottom) / 2;

  // The card from its back to its fans: backplate, circuit board, fin stack, shroud
  box(group, bodyLen - 2, 2, zLen - 2, M.gpuBack, midX, top - 1, midZ);
  box(group, bodyLen - 8, 1.6, zLen - 6, M.pcb, midX - 2, top - 3.2, midZ - 2);
  const shroud = part.thickness * 0.34;
  box(group, bodyLen, shroud, zLen, M.gpuShroud, midX, bottom + shroud / 2, midZ);
  // Fins between the board and the shroud, seen through both long edges
  const finDepth = part.thickness - shroud - 5.5;
  const finCount = Math.floor((bodyLen - 26) / 5);
  copies(group, finCount, M.heatsink, (dummy, i) => {
    dummy.position.set(x0 + 16 + i * 5, top - 4.5 - finDepth / 2, midZ);
    dummy.scale.set(0.8, finDepth, zLen - 4);
  });
  // The closed end, away from the bracket
  box(group, 3, part.thickness - 2, zLen, M.gpuShroud, x0 + 3 + bodyLen - 1.5, midY, midZ);
  // A cut-out through the backplate near that end, as most long cards have
  if (part.length > 250) {
    for (let i = 0; i < 4; i++) box(group, 3, 0.5, zLen * 0.46, M.vent, x0 + part.length - 30 - i * 9, top + 0.1, midZ);
  }
  box(group, bl.pcie.len, 1.6, 9, M.gold, bl.pcie.len / 2, 0, 8.5);

  // The rear bracket: one slot width per row, vented, with its tab folded over the case
  const rows = Math.ceil(part.slots);
  const bracketH = rows * 20.32 - 2;
  box(group, 1.5, bracketH, 118, M.steel, x0 + 0.75, 10 - bracketH / 2, 56);
  box(group, 12, bracketH, 1.5, M.steel, x0 + 6, 10 - bracketH / 2, 115.5);
  for (let i = 0; i < rows; i++) {
    for (const z of [40, 62, 84]) box(group, 0.5, 11, 16, M.vent, x0 + 1.75, 4 - i * 20.32, z);
  }

  // Fans on the face that looks down, each in a ring let into the shroud
  const rotors: Object3D[] = [];
  const diameter = Math.min(zLen - 8, (bodyLen - 20) / part.fans - 4);
  for (let i = 0; i < part.fans; i++) {
    const x = x0 + 3 + (bodyLen * (i + 0.5)) / part.fans;
    const cooler = fan(group, diameter, 6, 9, true);
    cooler.group.rotation.x = Math.PI / 2;
    cooler.group.position.set(x, bottom + 2, midZ);
    rotors.push(cooler.rotor);
    const bezel = ring(group, diameter / 2 + 5, diameter / 2 + 1, 1.5, M.gpuShroud, x, bottom, midZ);
    bezel.rotation.x = Math.PI / 2;
  }

  for (const [x, y, z] of gpuPlugSpots(part, bl)) box(group, 19, 9, 5, M.slot, x, y - 3, z);
  const strip = glowMat(0x9aa0a8, 0xffffff);
  box(group, part.length * 0.3, 2.4, 1, strip, x0 + part.length * 0.3, bottom + shroud * 0.5, zBase + zLen + 0.3);

  const seat: Travel = { seat: [row.u, -row.v, 0], hover: [0, 0, 74], enter: [0, 0, 240] };
  return {
    group,
    frame: 'board',
    duration: 2.2,
    rotors,
    glow: [strip],
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
  // The fan grille on top: rings, spokes and a hub
  const grille = Math.min(len, width) * 0.44;
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
