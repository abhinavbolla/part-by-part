// Cable runs. From the open side you see a plug at each end and the stretch of
// cable from it to where it ducks behind the tray or under the shroud. Behind
// the tray, each cable carries on: down a run beside the grommets, held by the
// straps, to the open end of the power-supply chamber. That part shows when
// the far panel is off. A cable is plugged in, then drawn along its route.

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

/** Where each kind of cable runs behind the tray: millimetres from the grommets' centre line. */
const LANE = { atx24: -3, eps: 10, sata: -14 } as const;

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

  // ---- behind the tray -------------------------------------------------------
  const backs: Mesh[] = [];
  const zb = lay.trayZ - 9;
  const trunkX = lay.grommets[0].x;
  const { chamber } = lay;
  const hidden = (points: P3[], radius: number, material = M.cable): void => {
    backs.push(tube(group, points, radius, material, false, Math.max(24, points.length * 8)));
  };
  /** Down the run from a grommet into the chamber, or on to `to` when the cable ends at the power supply. */
  const fromGrommet = (grommet: { x: number; y: number }, lane: number, radius: number, to: P3 | null, material = M.cable): void => {
    const x = trunkX + lane;
    const foot: P3[] = to
      ? [[x, chamber.y1 - 6, zb], [(x + to[0]) / 2 + 8, to[1] + 16, zb], [to[0] + 4, to[1] + 2, zb + 2], to]
      : [[x, chamber.y1 + 4, zb], [x, chamber.y1 - 10, zb + 4], [x - 4, chamber.y1 - 18, lay.trayZ + 6]];
    hidden([
      [grommet.x, grommet.y, behind], [(grommet.x + x) / 2, grommet.y - 10, zb], [x, grommet.y - 28, zb],
      ...foot,
    ], radius, material);
  };
  /** From the cut-out above the board: along the top, then down the run to `to`. */
  const fromTop = (x: number, lane: number, radius: number, to: P3 | null): void => {
    const lx = trunkX + lane;
    const y = lay.topCut.y;
    const foot: P3[] = to
      ? [[lx, chamber.y1 - 6, zb], [(lx + to[0]) / 2 + 8, to[1] + 16, zb], [to[0] + 4, to[1] + 2, zb + 2], to]
      : [[lx, chamber.y1 + 4, zb]];
    hidden([
      [x, y, behind], [x + 8, y - 10, zb], [x + 34, y - 16, zb],
      [lx - 30, y - 16, zb], [lx - 6, y - 26, zb], [lx, y - 52, zb],
      [lx, lay.board.y - 150, zb],
      ...foot,
    ], radius);
  };

  /**
   * The end that plugs into the power supply, if one is fitted. A cable for
   * something above the shroud stays in the chamber and comes up at `under`;
   * the others pass through the tray, and the point where they do is returned.
   */
  const psuEnd = (psu: PsuPart | undefined, index: number, radius: number, under?: P3): P3 | null => {
    if (!psu) return null;
    const [sx, sy, sz] = psuSocket(psu, lay, index);
    if (under) {
      const turn = Math.max(under[0], sx + 42);
      run([10, 12, 15], [sx + 5, sy, sz], [18, 0, 0], [
        [sx + 10, sy, sz],
        [sx + 28, sy + 3, sz],
        [(sx + 28 + turn) / 2 + 6, (sy + under[1]) / 2 - 4, (sz + under[2]) / 2],
        [turn, under[1] - 24, under[2] + 3],
        [under[0], under[1] - 6, under[2]],
        under,
      ], radius);
      return null;
    }
    // Side by side through the tray, in the order of their sockets
    const column = Math.floor(index / 2);
    const through: P3 = [
      Math.min(chamber.x1 - 10, Math.max(chamber.x0 + 10, sx + 34 + column * 11)),
      Math.min(chamber.y1 - 12, sy + 8 + column * 12),
      behind,
    ];
    run([10, 12, 15], [sx + 5, sy, sz], [18, 0, 0], [
      [sx + 10, sy, sz],
      [sx + 30, sy + 2, sz - 4],
      [through[0] + 2, through[1] - 2, (sz + lay.trayZ) / 2],
      through,
    ], radius);
    return through;
  };

  switch (cable.kind) {
    case 'atx24': {
      const spot = bl.atx24;
      const [x, y] = [X(spot.u), Y(spot.v)];
      const board = (points: P3[], size: P3): void => run(size, [x, y, Z(17.5)], [0, 0, 20], points, 5.5);
      if (spot.across) {
        board([[x, y, Z(22)], [x, y + 10, Z(30)], [x, lay.topCut.y, Z(14)], [x, lay.topCut.y, behind]], [52, 10, 9]);
        fromTop(x, LANE.atx24, 5.5, psuEnd(slots.psu, PSU_SOCKET.atx24, 5.5));
      } else {
        const grommet = grommetNear(y);
        board([
          [x, y, Z(22)], [x + 10, y, Z(34)],
          [(x + grommet.x) / 2 + 6, (y + grommet.y) / 2, Z(30)],
          [grommet.x, grommet.y, Z(8)], [grommet.x, grommet.y, behind],
        ], [10, 52, 9]);
        fromGrommet(grommet, LANE.atx24, 5.5, psuEnd(slots.psu, PSU_SOCKET.atx24, 5.5));
      }
      break;
    }
    case 'eps': {
      const spot = bl.eps[0];
      const [x, y] = [X(spot.u), Y(spot.v)];
      run([19, 10, 9], [x, y, Z(17.5)], [0, 0, 20], [
        [x, y, Z(22)], [x, y + 8, Z(28)], [x, lay.topCut.y, Z(12)], [x, lay.topCut.y, behind],
      ], 4);
      fromTop(x, LANE.eps, 4, psuEnd(slots.psu, PSU_SOCKET.eps, 4));
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
        psuEnd(slots.psu, PSU_SOCKET.gpu + i * 2, 4, [land, underShroud, cutZ]);
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
      let power: P3 | undefined;
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
        power = [land + 8, underShroud, cutZ];
      }
      const port = bl.sata;
      const [x, y] = [X(port.u), Y(port.v)];
      const grommet = grommetNear(y);
      run([8, 12, 5], [x + 1, y, Z(10.5)], [0, 0, 14], [
        [x + 1, y, Z(14)], [x + 10, y - 2, Z(22)], [grommet.x, grommet.y, Z(8)], [grommet.x, grommet.y, behind],
      ], 2, M.cableData);
      fromGrommet(grommet, LANE.sata, 2, null, M.cableData);
      psuEnd(slots.psu, PSU_SOCKET.sata, 2.6, power);
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
        // From the ports on the roof: down the front edge behind the tray, into the chamber
        const fx = lay.frontInner - 22 + dx * 0.6;
        hidden([
          [fx - 30, lay.H - 10, zb], [fx - 6, lay.H - 22, zb], [fx, lay.H - 60, zb],
          [fx, chamber.y1 + 60, zb], [(fx + chamber.x1) / 2, chamber.y1 + 8, zb],
          [chamber.x1 - 12 + dx * 0.5, chamber.y1 - 12, zb + 3], [chamber.x1 - 18 + dx * 0.5, chamber.y1 - 20, lay.trayZ + 6],
        ], 1.6);
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
      for (const item of backs) reveal(item, seg(p, 0.66, 0.99));
    },
  };
}
