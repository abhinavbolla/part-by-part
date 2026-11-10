// The parts that go into the case. Each is drawn from its catalog dimensions
// as a generic shape: right size, no logos, no product styling.

import { Group, InstancedMesh, Object3D } from 'three';

import type {
  CoolerPart,
  CpuPart,
  GpuPart,
  PsuPart,
  RamPart,
  StoragePart,
} from '../../catalog/types.ts';
import { HOVER, driveScrew, easeInOut, easeOut, push, seg, travel, type Travel } from '../anim.ts';
import { BOARD, type CaseLayout } from '../layout.ts';
import { M, UNIT_BOX, box, cyl, fan, glowMat, rbox, screw } from '../kit.ts';
import type { Fixtures, PartModel } from './types.ts';

const CPU_HEIGHT = 4.4;

/** Open while the part comes in over [a0, a1], shut again over [b0, b1]. */
const openShut = (p: number, a0: number, a1: number, b0: number, b1: number): number =>
  easeInOut(seg(p, a0, a1)) * (1 - easeInOut(seg(p, b0, b1)));

export function buildCpu(part: CpuPart, fx: Fixtures): PartModel {
  const group = new Group();
  const { w, h } = part.pkg;
  box(group, w, h, 1.2, M.substrate, 0, 0, 0.6);
  rbox(group, w - 6, h - 6, CPU_HEIGHT - 1.2, 1, M.steel, 0, 0, 1.2 + (CPU_HEIGHT - 1.2) / 2);
  box(group, 3, 3, 0.2, M.gold, -w / 2 + 2.5, -h / 2 + 2.5, 1.3);

  const seat: Travel = {
    seat: [BOARD.socket.u, -BOARD.socket.v, BOARD.socket.top],
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

export function buildCooler(part: CoolerPart): PartModel {
  const group = new Group();
  const finDepth = part.depth - 26;
  const stackBase = 34;

  box(group, 40, 40, 8, M.copper, 0, 0, 4);
  box(group, 14, 104, 3, M.steel, 0, 0, 9.5);
  const pipeLen = part.height - 10;
  for (const y of [-36, -18, 0, 18, 36]) {
    for (const x of [-13, 13]) cyl(group, 3, pipeLen, M.steel, 'z', x, y, 8 + pipeLen / 2, true);
  }

  const pitch = 2.3;
  const count = Math.floor((part.height - 4 - stackBase) / pitch);
  const fins = new InstancedMesh(UNIT_BOX, M.alu, count);
  const dummy = new Object3D();
  for (let i = 0; i < count; i++) {
    dummy.position.set(0, 0, stackBase + i * pitch);
    dummy.scale.set(finDepth, part.width, 0.6);
    dummy.updateMatrix();
    fins.setMatrixAt(i, dummy.matrix);
  }
  fins.instanceMatrix.needsUpdate = true;
  fins.computeBoundingBox();
  fins.computeBoundingSphere();
  group.add(fins);
  box(group, finDepth, part.width, 1.6, M.alu, 0, 0, part.height - 3.2);

  const screws = [screw(group, 0, 46, 11), screw(group, 0, -46, 11)];

  const blower = fan(group, part.fanSize, 25);
  blower.group.rotation.y = Math.PI / 2;
  const fanX = finDepth / 2 + 13;
  blower.group.position.set(fanX, 0, part.height - 4 - part.fanSize / 2);

  const seat: Travel = {
    seat: [BOARD.socket.u, -BOARD.socket.v, BOARD.socket.top + CPU_HEIGHT],
    hover: [0, 0, 84],
    enter: [0, 0, 230],
  };
  return {
    group,
    frame: 'board',
    duration: 2.5,
    rotors: [blower.rotor],
    glow: [],
    setProgress(p) {
      travel(group, p, seat, 0.4, 0.62, easeInOut);
      screws.forEach((item, i) => driveScrew(item, p, 0.64 + i * 0.07, 0.76 + i * 0.07, 11));
      // The fan travels alongside, then clips onto the fins last.
      blower.group.position.x = fanX + (1 - push(seg(p, 0.84, 0.99))) * 64;
    },
  };
}

export function buildRam(part: RamPart, fx: Fixtures): PartModel {
  const group = new Group();
  const { dimm } = BOARD;
  const shell = part.ramType === 'DDR5' ? M.ramBlack : M.ramGrey;
  const bar = glowMat(0xd9dde2, 0xffffff);
  const sticks: Group[] = [];
  for (const index of [1, 3].slice(0, part.modules)) {
    const stick = new Group();
    stick.position.set(dimm.u[index], -(dimm.v0 + dimm.len / 2), 0);
    box(stick, 1.4, 126, 5, M.gold, 0, 0, 5.5);
    rbox(stick, 7, 133.35, part.height - 6, 1.2, shell, 0, 0, 9 + (part.height - 6) / 2);
    box(stick, 3.2, 118, 1.2, bar, 0, 0, 3 + part.height + 0.3);
    group.add(stick);
    sticks.push(stick);
  }

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
        stick.position.z = 56 * (1 - push(seg(p, 0.4 + i * 0.14, 0.64 + i * 0.16)));
      });
      if (drive) fx.dimm(easeInOut(seg(p, 0.05, 0.3)) * (1 - seg(p, 0.86, 0.92)));
    },
  };
}

export function buildStorage(part: StoragePart): PartModel {
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

  const seat: Travel = {
    seat: [BOARD.m2.u, -BOARD.m2.v, BOARD.m2.z],
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

export function buildGpu(part: GpuPart, fx: Fixtures): PartModel {
  const group = new Group();
  const { pcie } = BOARD;
  const x0 = -(pcie.u + 10); // bracket sits against the rear panel
  const top = 3;
  const zBase = 13;
  const zLen = part.height - 9;
  const bodyLen = part.length - 3;
  const midX = x0 + 3 + bodyLen / 2;
  const midZ = zBase + zLen / 2;

  rbox(group, bodyLen, part.thickness - 2.5, zLen, 3, M.gpuShroud,
    midX, top - 2.5 - (part.thickness - 2.5) / 2, midZ);
  box(group, bodyLen - 2, 2, zLen - 2, M.gpuBack, midX, top - 1, midZ);
  box(group, pcie.len, 1.6, 9, M.gold, pcie.len / 2, 0, 8.5);

  const rows = Math.ceil(part.slots);
  const bracketH = rows * 20.32 - 2;
  box(group, 1.5, bracketH, 118, M.steel, x0 + 0.75, 10 - bracketH / 2, 56);
  box(group, 0.4, bracketH - 12, 62, M.vent, x0 + 1.7, 10 - bracketH / 2, 70);

  const rotors: Object3D[] = [];
  const diameter = Math.min(zLen - 8, (bodyLen - 20) / part.fans - 4);
  for (let i = 0; i < part.fans; i++) {
    const cooler = fan(group, diameter, 6, 9);
    cooler.group.rotation.x = Math.PI / 2;
    cooler.group.position.set(
      x0 + 3 + (bodyLen * (i + 0.5)) / part.fans,
      top - part.thickness + 2,
      midZ,
    );
    rotors.push(cooler.rotor);
  }

  // Fin stack showing through the edge that faces the viewer
  const finRun = bodyLen * 0.5;
  for (let i = 0; i < 18; i++) {
    box(group, 1.2, part.thickness - 16, 1, M.heatsink,
      x0 + 16 + (finRun * i) / 17, top - 2.5 - (part.thickness - 2.5) / 2 - 2, zBase + zLen + 0.2);
  }

  const plugs = part.connectors.pcie8 + part.connectors.hpwr16;
  for (let i = 0; i < plugs; i++) {
    box(group, 19, 9, 5, M.slot, x0 + part.length - 70 - i * 23, top - 9, zBase + zLen + 1.5);
  }
  const strip = glowMat(0x9aa0a8, 0xffffff);
  box(group, part.length * 0.36, 2.4, 1, strip, x0 + part.length * 0.34, top - 9, zBase + zLen + 0.3);

  const seat: Travel = {
    seat: [pcie.u, -pcie.v[0], 0],
    hover: [0, 0, 74],
    enter: [0, 0, 240],
  };
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

export function buildPsu(part: PsuPart, lay: CaseLayout): PartModel {
  const group = new Group();
  const len = part.length;
  rbox(group, len, 86, 150, 2, M.psu, len / 2, 43, 75);
  box(group, len * 0.5, 26, 0.5, M.labelDim, len * 0.42, 50, 150.1);
  box(group, len * 0.5, 3, 0.6, M.heatsinkDark, len * 0.42, 43, 150.2);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 5; col++) {
      box(group, 0.8, 13, 17, M.slot, len + 0.2, 24 + row * 34, 22 + col * 26.5);
    }
  }
  cyl(group, 62, 0.6, M.vent, 'y', len / 2, 86.2, 75);
  cyl(group, 16, 0.8, M.fanFrame, 'y', len / 2, 86.6, 75);

  const seat: Travel = {
    seat: [lay.psu.x, lay.psu.y, lay.psu.z],
    hover: [0, 0, 150],
    enter: [0, 0, 190],
  };
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
