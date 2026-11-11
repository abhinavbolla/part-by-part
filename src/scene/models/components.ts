// The parts that go into the case. Each is drawn from its catalog dimensions
// as a generic shape: right size, no logos, no product styling.

import { Group, InstancedMesh, Object3D, type Mesh } from 'three';

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
import { M, UNIT_BOX, box, cyl, fan, glowMat, rbox, reveal, screw, tube } from '../kit.ts';
import type { Fixtures, PartModel } from './types.ts';

export const CPU_HEIGHT = 4.4;

/** Open while the part comes in over [a0, a1], shut again over [b0, b1]. */
const openShut = (p: number, a0: number, a1: number, b0: number, b1: number): number =>
  easeInOut(seg(p, a0, a1)) * (1 - easeInOut(seg(p, b0, b1)));

export function buildCpu(part: CpuPart, bl: BoardLayout, fx: Fixtures): PartModel {
  const group = new Group();
  const { w, h } = packageSize(part.socket);
  box(group, w, h, 1.2, M.substrate, 0, 0, 0.6);
  rbox(group, w - 6, h - 6, CPU_HEIGHT - 1.2, 1, M.steel, 0, 0, 1.2 + (CPU_HEIGHT - 1.2) / 2);
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

/** A stack of fins standing on the cooler base, heat pipes through it. */
function finStack(parent: Object3D, depth: number, width: number, height: number, x: number): void {
  const base = 34;
  const pitch = 4;
  const count = Math.floor((height - 4 - base) / pitch);
  const fins = new InstancedMesh(UNIT_BOX, M.alu, count);
  const dummy = new Object3D();
  for (let i = 0; i < count; i++) {
    dummy.position.set(x, 0, base + i * pitch);
    dummy.scale.set(depth, width, 0.6);
    dummy.updateMatrix();
    fins.setMatrixAt(i, dummy.matrix);
  }
  fins.instanceMatrix.needsUpdate = true;
  fins.computeBoundingBox();
  fins.computeBoundingSphere();
  parent.add(fins);
  box(parent, depth, width, 1.6, M.alu, x, 0, height - 3.2);
  const pipeLen = height - 10;
  const reach = Math.min(36, width / 2 - 18);
  for (const y of [-reach, -reach / 2, 0, reach / 2, reach]) {
    for (const dx of [-depth / 2 + 9, depth / 2 - 9]) {
      cyl(parent, 3, pipeLen, M.steel, 'z', x + dx, y, 8 + pipeLen / 2, true);
    }
  }
}

export function buildAirCooler(part: AirCoolerPart, bl: BoardLayout): PartModel {
  const group = new Group();
  const fanDepth = 25;
  const towers = part.towers;
  const stack = Math.max(30, (part.depth - fanDepth * part.fans) / towers);

  box(group, 40, 40, 8, M.copper, 0, 0, 4);
  box(group, 14, 104, 3, M.steel, 0, 0, 9.5);

  // Along x from the front: [fan] tower [fan] tower. A single tower has its fan in front.
  const centres = towers === 2 ? [fanDepth / 2 + stack / 2, -(fanDepth / 2 + stack / 2)] : [0];
  for (const x of centres) finStack(group, stack, part.width, part.height, x);

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
    const blower = fan(group, part.fanSize, fanDepth);
    blower.group.rotation.y = Math.PI / 2;
    return { ...spot, blower };
  });

  const screws = [screw(group, 0, 46, 11), screw(group, 0, -46, 11)];
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
      screws.forEach((item, i) => driveScrew(item, p, 0.64 + i * 0.06, 0.74 + i * 0.06, 11));
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
      fanAxis: 'y' as const,
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
    fanAxis: 'x' as const,
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
  const cpuTop: [number, number, number] = [
    lay.board.x + bl.socket.u,
    lay.board.y - bl.socket.v,
    lay.board.z + bl.socket.top + CPU_HEIGHT,
  ];

  // Pump block
  const block = new Group();
  box(block, 44, 44, 6, M.copper, 0, 0, 3);
  rbox(block, 66, 66, part.height - 6, 6, M.gpuShroud, 0, 0, 6 + (part.height - 6) / 2);
  const cap = glowMat(0x3a3e45, 0xffffff);
  cyl(block, 22, 1.2, cap, 'z', 0, 0, part.height + 0.4);
  const screws = [[30, 30], [30, -30], [-30, 30], [-30, -30]].map(([x, y]) => screw(block, x, y, 7, 2.4));
  group.add(block);

  // Radiator and its fans
  const place = radiatorPlace(part, lay, mount);
  const rad = new Group();
  rbox(rad, place.size[0], place.size[1], place.size[2], 2, M.radiator, ...place.centre);
  const rotors: Object3D[] = [];
  for (let i = 0; i < part.fans; i++) {
    const blower = fan(rad, part.fanSize, 25);
    if (place.fanAxis === 'y') blower.group.rotation.x = Math.PI / 2;
    else blower.group.rotation.y = -Math.PI / 2;
    blower.group.position.set(...place.fanCentre(i));
    rotors.push(blower.rotor);
  }
  group.add(rad);

  // Two hoses from the block to the radiator
  const hoses: Mesh[] = [-9, 9].map((dz) => {
    const start: [number, number, number] = [cpuTop[0] + 30, cpuTop[1] + dz, cpuTop[2] + part.height * 0.6];
    const end: [number, number, number] = [place.port[0], place.port[1], place.port[2] + dz];
    const lift = Math.max(start[2], end[2]) + 26;
    return tube(group, [
      start,
      [start[0] + 26, start[1], start[2] + 12],
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

export function buildRam(part: RamPart, bl: BoardLayout, fx: Fixtures): PartModel {
  const group = new Group();
  const { dimm } = bl;
  const shell = part.ramType === 'DDR5' ? M.ramBlack : M.ramGrey;
  const bar = glowMat(0xd9dde2, 0xffffff);
  const slots = part.modules > 2 ? dimm.u.map((_, i) => i) : dimm.pair.slice(0, part.modules);
  const sticks: Group[] = slots.map((index) => {
    const stick = new Group();
    stick.position.set(dimm.u[index], -(dimm.v0 + dimm.len / 2), 0);
    box(stick, 1.4, 126, 5, M.gold, 0, 0, 5.5);
    rbox(stick, 7, 133.35, part.height - 6, 1.2, shell, 0, 0, 9 + (part.height - 6) / 2);
    box(stick, 3.2, 118, 1.2, bar, 0, 0, 3 + part.height + 0.3);
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
  box(drive, len, 22, 0.8, M.pcb, len / 2, 0, 0.4);
  box(drive, 4, 20, 0.9, M.gold, -1.5, 0, 0.4);
  box(drive, 12, 12, 1.1, M.chip, 16, 0, 1.35);
  box(drive, 14, 16, 1.1, M.chip, 38, 0, 1.35);
  box(drive, 14, 16, 1.1, M.chip, 58, 0, 1.35);
  box(drive, len - 18, 19, 0.25, M.label, len / 2 - 2, 0, 2.0);
  group.add(drive);
  const pin = screw(group, len - 2, 0, 0.8, 2.6);

  const spot = bl.m2[Math.min(slot, bl.m2.length - 1)];
  const seat: Travel = {
    seat: [spot.u, -spot.v, bl.m2z],
    hover: [0, 0, 50],
    enter: [0, 0, 220],
  };
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
  rbox(group, part.length, 7, 69.85, 1.2, M.heatsinkDark, 0, 3.5, 0);
  box(group, part.length - 22, 0.4, 46, M.labelDim, -4, 7.1, 2);
  box(group, 30, 3, 3, M.slot, 6, 2.5, -36);
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

  rbox(group, bodyLen, part.thickness - 2.5, zLen, 3, M.gpuShroud,
    midX, top - 2.5 - (part.thickness - 2.5) / 2, midZ);
  box(group, bodyLen - 2, 2, zLen - 2, M.gpuBack, midX, top - 1, midZ);
  box(group, bl.pcie.len, 1.6, 9, M.gold, bl.pcie.len / 2, 0, 8.5);

  const rows = Math.ceil(part.slots);
  const bracketH = rows * 20.32 - 2;
  box(group, 1.5, bracketH, 118, M.steel, x0 + 0.75, 10 - bracketH / 2, 56);
  box(group, 0.4, bracketH - 12, 62, M.vent, x0 + 1.7, 10 - bracketH / 2, 70);

  const rotors: Object3D[] = [];
  const diameter = Math.min(zLen - 8, (bodyLen - 20) / part.fans - 4);
  for (let i = 0; i < part.fans; i++) {
    const cooler = fan(group, diameter, 6, 9);
    cooler.group.rotation.x = Math.PI / 2;
    cooler.group.position.set(x0 + 3 + (bodyLen * (i + 0.5)) / part.fans, top - part.thickness + 2, midZ);
    rotors.push(cooler.rotor);
  }

  // Fin stack showing through the edge that faces the viewer
  const finRun = bodyLen * 0.5;
  for (let i = 0; i < 18; i++) {
    box(group, 1.2, part.thickness - 16, 1, M.heatsink,
      x0 + 16 + (finRun * i) / 17, top - 2.5 - (part.thickness - 2.5) / 2 - 2, zBase + zLen + 0.2);
  }
  for (const [x, y, z] of gpuPlugSpots(part, bl)) box(group, 19, 9, 5, M.slot, x, y - 3, z);
  const strip = glowMat(0x9aa0a8, 0xffffff);
  box(group, part.length * 0.3, 2.4, 1, strip, x0 + part.length * 0.3, top - part.thickness + 8, zBase + zLen + 0.3);

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
  rbox(group, len, height, width, 2, M.psu, len / 2, height / 2, width / 2);
  box(group, len * 0.5, height * 0.3, 0.5, M.labelDim, len * 0.42, height * 0.58, width + 0.1);
  box(group, len * 0.5, 3, 0.6, M.heatsinkDark, len * 0.42, height * 0.5, width + 0.2);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 5; col++) {
      box(group, 0.8, height * 0.15, width * 0.11, M.slot,
        len + 0.2, height * (0.3 + row * 0.4), width * (0.16 + col * 0.17));
    }
  }
  const grille = Math.min(len, width) * 0.42;
  cyl(group, grille, 0.6, M.vent, 'y', len / 2, height + 0.2, width / 2);
  cyl(group, grille * 0.26, 0.8, M.fanFrame, 'y', len / 2, height + 0.6, width / 2);

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
