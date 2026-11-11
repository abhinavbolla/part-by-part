// Cable runs. Only the parts you would see are drawn: a plug at each visible
// end and the stretch of cable from it to where it ducks behind the tray or
// under the shroud. A cable is plugged in, then drawn along its route.

import { Group, type Mesh } from 'three';

import type { CablePart, GpuPart, PsuPart } from '../../catalog/types.ts';
import type { Slots, StorageMount } from '../../rules/compat.ts';
import { easeInOut, push, seg, travel } from '../anim.ts';
import type { BoardLayout, CaseLayout } from '../layout.ts';
import { M, box, reveal, tube } from '../kit.ts';
import { CPU_HEIGHT, gpuPlugSpots, psuSocket } from './components.ts';
import type { PartModel } from './types.ts';

type P3 = [number, number, number];

export interface CableContext {
  lay: CaseLayout;
  bl: BoardLayout;
  slots: Slots;
  mounts: Map<string, StorageMount | null>;
}

interface Run {
  plug: Mesh;
  home: P3;
  /** Offset the plug starts from before it is pushed in. */
  out: P3;
  tube: Mesh;
}

/** PSU front-face socket used by each kind of cable. */
const PSU_SOCKET = { atx24: 0, eps: 2, gpu: 4, sata: 9 } as const;

export function buildCable(cable: CablePart, ctx: CableContext): PartModel {
  const { lay, bl, slots } = ctx;
  const group = new Group();
  const runs: Run[] = [];
  const X = (u: number): number => lay.board.x + u;
  const Y = (v: number): number => lay.board.y - v;
  const Z = (h: number): number => lay.board.z + h;
  const behind = lay.trayZ - 3;
  const cutZ = lay.shroudCut.z;
  const underShroud = lay.shroudTopY - 10;
  const clampCut = (x: number): number => Math.max(lay.shroudCut.x0 + 6, Math.min(lay.shroudCut.x1 - 6, x));
  const grommetNear = (y: number) =>
    lay.grommets.reduce((best, item) => (Math.abs(item.y - y) < Math.abs(best.y - y) ? item : best));

  const run = (
    size: P3, home: P3, out: P3, points: P3[], radius: number, material = M.cable,
  ): void => {
    const plug = box(group, size[0], size[1], size[2], M.black, ...home);
    runs.push({ plug, home, out, tube: tube(group, points, radius, material) });
  };

  /** The end that plugs into the power supply, if one is fitted. */
  const psuEnd = (psu: PsuPart | undefined, index: number, radius: number): void => {
    if (!psu) return;
    const [sx, sy, sz] = psuSocket(psu, lay, index);
    run([10, 12, 15], [sx + 5, sy, sz], [18, 0, 0], [
      [sx + 10, sy, sz],
      [sx + 32, sy + 2, sz - 4],
      [sx + 46, sy + 6, (sz + lay.trayZ) / 2],
      [sx + 44, sy + 8, behind],
    ], radius);
  };

  switch (cable.kind) {
    case 'atx24': {
      const spot = bl.atx24;
      const [x, y] = [X(spot.u), Y(spot.v)];
      if (spot.across) {
        run([52, 10, 9], [x, y, Z(17.5)], [0, 0, 20], [
          [x, y, Z(22)], [x, y + 10, Z(30)], [x, lay.topCut.y, Z(14)], [x, lay.topCut.y, behind],
        ], 5.5);
      } else {
        const grommet = grommetNear(y);
        run([10, 52, 9], [x, y, Z(17.5)], [0, 0, 20], [
          [x, y, Z(22)], [x + 10, y, Z(34)],
          [(x + grommet.x) / 2 + 6, (y + grommet.y) / 2, Z(30)],
          [grommet.x, grommet.y, Z(8)], [grommet.x, grommet.y, behind],
        ], 5.5);
      }
      psuEnd(slots.psu, PSU_SOCKET.atx24, 5.5);
      break;
    }
    case 'eps': {
      const spot = bl.eps[0];
      const [x, y] = [X(spot.u), Y(spot.v)];
      run([19, 10, 9], [x, y, Z(17.5)], [0, 0, 20], [
        [x, y, Z(22)], [x, y + 8, Z(28)], [x, lay.topCut.y, Z(12)], [x, lay.topCut.y, behind],
      ], 4);
      psuEnd(slots.psu, PSU_SOCKET.eps, 4);
      break;
    }
    case 'gpu': {
      const gpu = slots.gpu as GpuPart;
      const row = bl.pcie.rows[0];
      gpuPlugSpots(gpu, bl).forEach(([sx, sy, sz], i) => {
        const [gx, gy, gz] = [X(row.u) + sx, Y(row.v) + sy - 3, Z(sz)];
        const land = clampCut(gx + 30);
        run([19, 9, 10], [gx, gy, gz + 7.5], [0, 0, 22], [
          [gx, gy, gz + 12],
          [gx + 12, gy - 5, gz + 34],
          [gx + 26, gy - gpu.thickness - 12, gz + 24],
          [land + 2, lay.shroudTopY + 34, (gz + cutZ) / 2 + 10],
          [land, lay.shroudTopY + 2, cutZ + 8],
          [land, underShroud, cutZ],
        ], 4);
        psuEnd(slots.psu, PSU_SOCKET.gpu + i * 2, 4);
      });
      break;
    }
    case 'cooler': {
      const cooler = slots.cooler;
      const header = bl.fanHeader;
      const [x, y] = [X(header.u), Y(header.v)];
      const end: P3 = cooler?.kind === 'aio'
        ? [X(bl.socket.u), Y(bl.socket.v) + 33, Z(bl.socket.top + CPU_HEIGHT + cooler.height * 0.5)]
        : [X(bl.socket.u) + 6, Y(bl.socket.v) + Math.min(60, (cooler?.width ?? 120) / 2 - 2), Z(52)];
      run([10, 4, 5], [x, y, Z(10.5)], [0, 0, 12], [
        [x, y, Z(13)], [x - 2, y - 10, Z(27)],
        [(x + end[0]) / 2, (y + end[1]) / 2, Z(40)], end,
      ], 1.4);
      break;
    }
    case 'sata': {
      const mount = cable.target ? ctx.mounts.get(cable.target) : null;
      const bay = lay.bays[mount?.kind === 'bay' ? mount.index : 0] ?? lay.bays[0];
      if (bay) {
        const edge = bay.z - 36;
        const land = clampCut(bay.x);
        run([12, 4, 6], [bay.x - 8, bay.y + 3, edge - 3], [0, 0, -14], [
          [bay.x - 8, bay.y + 3, edge - 6], [bay.x - 8, bay.y + 7, edge - 22],
          [land - 6, bay.y + 3, cutZ + 7], [land - 6, underShroud, cutZ],
        ], 2, M.cableData);
        run([16, 4, 6], [bay.x + 10, bay.y + 3, edge - 3], [0, 0, -14], [
          [bay.x + 10, bay.y + 3, edge - 6], [bay.x + 10, bay.y + 8, edge - 24],
          [land + 8, bay.y + 3, cutZ + 7], [land + 8, underShroud, cutZ],
        ], 2.6);
      }
      const port = bl.sata;
      const [x, y] = [X(port.u), Y(port.v)];
      const grommet = grommetNear(y);
      run([8, 12, 5], [x + 1, y, Z(10.5)], [0, 0, 14], [
        [x + 1, y, Z(14)], [x + 10, y - 2, Z(22)], [grommet.x, grommet.y, Z(8)], [grommet.x, grommet.y, behind],
      ], 2, M.cableData);
      psuEnd(slots.psu, PSU_SOCKET.sata, 2.6);
      break;
    }
    case 'front': {
      const header = bl.frontHeader;
      const [x, y] = [X(header.u), Y(header.v)];
      const land = clampCut(x);
      const far = y - lay.shroudTopY > 40;
      for (const dx of [-6, 6]) {
        const plug: P3 = [x + dx, y, Z(11)];
        const points: P3[] = far
          ? [[x + dx, y, Z(14)], [x + dx, y - 12, Z(20)], [land + dx, (y + lay.shroudTopY) / 2, Z(9)],
            [land + dx, lay.shroudTopY + 3, cutZ + 4], [land + dx, underShroud, cutZ]]
          : [[x + dx, y, Z(14)], [x + dx, y - 5, Z(19)], [land + dx, lay.shroudTopY + 1, cutZ + 6],
            [land + dx, underShroud, cutZ]];
        run([11, 5, 6], plug, [0, 0, 14], points, 1.6);
      }
      break;
    }
  }

  const each = runs.length > 1 ? 0.14 / (runs.length - 1) : 0;
  return {
    group,
    frame: 'case',
    duration: 1.5,
    rotors: [],
    glow: [],
    ghostTargets: runs.map((item) => item.plug),
    setProgress(p) {
      travel(group, p, { seat: [0, 0, 0], hover: [0, 0, 30], enter: [0, 0, 150] }, 0.38, 0.5, easeInOut);
      runs.forEach((item, i) => {
        const k = 1 - push(seg(p, 0.5 + i * each, 0.62 + i * each));
        item.plug.position.set(
          item.home[0] + item.out[0] * k,
          item.home[1] + item.out[1] * k,
          item.home[2] + item.out[2] * k,
        );
        reveal(item.tube, seg(p, 0.62 + i * each, 0.97));
      });
    },
  };
}
