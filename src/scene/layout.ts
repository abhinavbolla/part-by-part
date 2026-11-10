// Where things are. Case frame: x runs rear (-) to front (+), y is up from
// the bench, z points out of the open side toward the viewer. Board frame:
// origin at the top-rear corner of the PCB's top surface, u along +x,
// v along -y, z out of the board.
//
// Board feature positions are a generic ATX arrangement. The outline and the
// 20.32 mm slot pitch follow the standard; the rest is approximate and not
// taken from any one board's drawing.

import type { CasePart } from '../catalog/types.ts';

export const BOARD = {
  w: 244,
  h: 305,
  thickness: 1.6,
  socket: { u: 112, v: 95, top: 3.9 },
  /** DIMM slot centre lines along u; a two-module kit uses slots 1 and 3. */
  dimm: { u: [186, 195.5, 205, 214.5], v0: 24, len: 142, height: 8 },
  /** M.2 connector; the drive runs toward +u from here. */
  m2: { u: 94, v: 160, z: 3.2 },
  /** Expansion slot rows; the graphics card uses the first. */
  pcie: { u: 28, len: 89, height: 11, v: [187, 227.64, 268.28] },
  /** Mounting holes (approximate ATX pattern). */
  holes: [
    [16, 10], [140, 10], [236, 10],
    [16, 165], [140, 165], [236, 165],
    [16, 294], [140, 294], [236, 294],
  ] as [number, number][],
} as const;

export interface CaseLayout {
  L: number;
  W: number;
  H: number;
  rearX: number;
  frontX: number;
  /** Inner face of the rear panel. */
  rearInner: number;
  /** Inner face of the front panel assembly. */
  frontInner: number;
  floorY: number;
  shroudTopY: number;
  /** Viewer-facing surface of the motherboard tray. */
  trayZ: number;
  /** Board frame origin in the case frame. */
  board: { x: number; y: number; z: number };
  /** PSU bay: rear-bottom corner nearest the tray. */
  psu: { x: number; y: number; z: number };
}

export const PANEL = 3;
export const FRONT_DEPTH = 28;
export const STANDOFF = 6.5;

export function caseLayout(pcCase: CasePart): CaseLayout {
  const { length: L, width: W, height: H } = pcCase.dims;
  const rearX = -L / 2;
  const frontX = L / 2;
  const floorY = 22;
  const shroudTopY = floorY + 96;
  const trayZ = -W / 2 + 26;
  const rearInner = rearX + PANEL;
  return {
    L, W, H, rearX, frontX,
    rearInner,
    frontInner: frontX - FRONT_DEPTH,
    floorY,
    shroudTopY,
    trayZ,
    board: {
      x: rearInner + 10,
      y: shroudTopY + 6 + BOARD.h,
      z: trayZ + STANDOFF + BOARD.thickness,
    },
    psu: { x: rearInner + 1, y: floorY + 3, z: trayZ + 8 },
  };
}
