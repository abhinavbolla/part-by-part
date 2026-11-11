// Where things are. Case frame: x runs rear (-) to front (+), y is up from
// the bench, z points out of the open side toward the viewer. Board frame:
// origin at the top-rear corner of the PCB's top surface, u along +x,
// v along -y, z out of the board.
//
// Board feature positions are generic arrangements per form factor. The
// outlines and the 20.32 mm slot pitch follow the standards; the rest is
// approximate and not taken from any one board's drawing.

import type { CasePart, FormFactor } from '../catalog/types.ts';

export interface Spot {
  u: number;
  v: number;
}

/** A block drawn on the board for looks: heatsinks, shrouds, port stacks. */
export interface Decor extends Spot {
  w: number;
  h: number;
  z: number;
  tone: 'light' | 'dark' | 'slot';
  round?: number;
}

export interface BoardLayout {
  formFactor: FormFactor;
  w: number;
  h: number;
  thickness: number;
  socket: Spot & { top: number };
  /** DIMM slot centre lines along u; `pair` are the slots a two-module kit uses. */
  dimm: { u: number[]; v0: number; len: number; height: number; pair: number[] };
  /** M.2 connectors in fill order; the drive runs toward +u from each. */
  m2: Spot[];
  m2z: number;
  /** Expansion slot rows; the graphics card uses the first. */
  pcie: { u: number; len: number; height: number; rows: (Spot & { x16: boolean })[] };
  holes: Spot[];
  /** Power and header positions, for cables. */
  atx24: Spot & { across: boolean };
  eps: Spot[];
  fanHeader: Spot;
  frontHeader: Spot;
  sata: Spot;
  decor: Decor[];
  battery: Spot;
}

export const SLOT_PITCH = 20.32;
/** Where the first full-length slot of an ATX board sits: the case's second opening. */
export const GPU_ROW = 187;

const ATX: BoardLayout = {
  formFactor: 'ATX',
  w: 244,
  h: 305,
  thickness: 1.6,
  socket: { u: 112, v: 95, top: 3.9 },
  dimm: { u: [186, 195.5, 205, 214.5], v0: 24, len: 142, height: 8, pair: [1, 3] },
  m2: [{ u: 94, v: 160 }, { u: 118, v: 248 }, { u: 94, v: 207 }, { u: 122, v: 285 }],
  m2z: 3.2,
  pcie: {
    u: 28,
    len: 89,
    height: 11,
    rows: [
      { u: 28, v: GPU_ROW, x16: true },
      { u: 28, v: GPU_ROW + SLOT_PITCH * 2, x16: false },
      { u: 28, v: GPU_ROW + SLOT_PITCH * 4, x16: true },
    ],
  },
  holes: [
    { u: 16, v: 10 }, { u: 140, v: 10 }, { u: 236, v: 10 },
    { u: 16, v: 165 }, { u: 140, v: 165 }, { u: 236, v: 165 },
    { u: 16, v: 294 }, { u: 140, v: 294 }, { u: 236, v: 294 },
  ],
  atx24: { u: 233, v: 86, across: false },
  eps: [{ u: 62, v: 7 }, { u: 84, v: 7 }],
  fanHeader: { u: 150, v: 8 },
  frontHeader: { u: 206, v: 299 },
  sata: { u: 240, v: 205 },
  decor: [
    { u: 22, v: 87, w: 44, h: 150, z: 38, tone: 'dark', round: 3 },
    { u: 60, v: 94, w: 20, h: 112, z: 26, tone: 'light', round: 2 },
    { u: 124, v: 20, w: 96, h: 20, z: 24, tone: 'light', round: 2 },
    { u: 210, v: 212, w: 52, h: 50, z: 10, tone: 'dark', round: 2 },
    { u: 240, v: 272, w: 8, h: 30, z: 8, tone: 'slot' },
  ],
  battery: { u: 70, v: 248 },
};

const MATX: BoardLayout = {
  ...ATX,
  formFactor: 'mATX',
  h: 244,
  m2: [{ u: 94, v: 160 }, { u: 94, v: 207 }],
  pcie: {
    ...ATX.pcie,
    rows: [
      { u: 28, v: GPU_ROW, x16: true },
      { u: 28, v: GPU_ROW + SLOT_PITCH * 2, x16: false },
    ],
  },
  holes: [
    { u: 16, v: 10 }, { u: 140, v: 10 }, { u: 236, v: 10 },
    { u: 16, v: 165 }, { u: 140, v: 165 }, { u: 236, v: 165 },
    { u: 16, v: 227 }, { u: 236, v: 227 },
  ],
  frontHeader: { u: 206, v: 238 },
  sata: { u: 240, v: 190 },
  decor: [
    { u: 22, v: 87, w: 44, h: 150, z: 38, tone: 'dark', round: 3 },
    { u: 60, v: 94, w: 20, h: 112, z: 26, tone: 'light', round: 2 },
    { u: 124, v: 20, w: 96, h: 20, z: 24, tone: 'light', round: 2 },
    { u: 212, v: 206, w: 46, h: 36, z: 10, tone: 'dark', round: 2 },
  ],
  battery: { u: 150, v: 212 },
};

const ITX: BoardLayout = {
  formFactor: 'Mini-ITX',
  w: 170,
  h: 170,
  thickness: 1.6,
  socket: { u: 86, v: 66, top: 3.9 },
  dimm: { u: [150, 159.5], v0: 14, len: 142, height: 8, pair: [0, 1] },
  // Real Mini-ITX boards put the second slot on the back; it is drawn on top here so it can be seen.
  m2: [{ u: 52, v: 132 }, { u: 52, v: 108 }],
  m2z: 3.2,
  pcie: {
    u: 28,
    len: 89,
    height: 11,
    rows: [{ u: 28, v: GPU_ROW - SLOT_PITCH, x16: true }],
  },
  holes: [{ u: 16, v: 10 }, { u: 140, v: 10 }, { u: 16, v: 165 }, { u: 140, v: 165 }],
  atx24: { u: 112, v: 6, across: true },
  eps: [{ u: 60, v: 6 }],
  fanHeader: { u: 80, v: 5 },
  frontHeader: { u: 134, v: 150 },
  sata: { u: 22, v: 152 },
  decor: [
    { u: 20, v: 72, w: 40, h: 124, z: 38, tone: 'dark', round: 3 },
    { u: 49, v: 66, w: 12, h: 80, z: 24, tone: 'light', round: 2 },
  ],
  battery: { u: 140, v: 158 },
};

export function boardLayout(formFactor: FormFactor): BoardLayout {
  if (formFactor === 'Mini-ITX') return ITX;
  if (formFactor === 'mATX') return MATX;
  return ATX;
}

/** Standoff positions a case offers: the ATX pattern plus the extra microATX row. */
export const STANDOFFS: Spot[] = [...ATX.holes, { u: 16, v: 227 }, { u: 236, v: 227 }];

/** Package outline by socket, used to draw the processor and its socket. */
export function packageSize(socket: string): { w: number; h: number } {
  return socket.startsWith('LGA') ? { w: 45, h: 37.5 } : { w: 40, h: 40 };
}

/** Body size of a power supply by form factor: width and height; length is per model. */
export function psuBody(formFactor: string): { width: number; height: number } {
  if (formFactor === 'SFX') return { width: 125, height: 63.5 };
  if (formFactor === 'SFX-L') return { width: 125, height: 63.5 };
  return { width: 150, height: 86 };
}

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
  /** Cable pass-throughs in the tray, right of the board. */
  grommets: { x: number; y: number }[];
  /** Cut-out above the board for the CPU power cable. */
  topCut: { x0: number; x1: number; y: number };
  /** Slot in the shroud top, where cables come up from below. */
  shroudCut: { x0: number; x1: number; z: number };
  /** 2.5-inch drive mounts on top of the shroud. */
  bays: { x: number; y: number; z: number }[];
}

export const PANEL = 3;
export const FRONT_DEPTH = 28;
export const STANDOFF = 6.5;

export function caseLayout(pcCase: CasePart): CaseLayout {
  const { length: L, width: W, height: H } = pcCase.dims;
  const rearX = -L / 2;
  const frontX = L / 2;
  const trayZ = -W / 2 + 26;
  const rearInner = rearX + PANEL;
  const frontInner = frontX - FRONT_DEPTH;

  // Feet, shroud, board, then whatever is left above the board.
  let floorY = 22;
  const boardH = ATX.h;
  const shroudH = Math.max(90, Math.min(110, H - floorY - PANEL - 6 - boardH - 30));
  const spare = H - PANEL - (floorY + shroudH + 6 + boardH);
  if (spare < 12) floorY = Math.max(8, floorY - (12 - spare));
  const shroudTopY = floorY + shroudH;
  const boardY = shroudTopY + 6 + boardH;
  const boardX = rearInner + 10;

  const bayCount = Math.min(2, pcCase.bays.ssd25 + pcCase.bays.hdd35);
  const bays = Array.from({ length: bayCount }, (_, i) => ({
    x: frontInner - 150 - i * 112,
    y: shroudTopY,
    z: 30,
  }));

  return {
    L, W, H, rearX, frontX, rearInner, frontInner,
    floorY,
    shroudTopY,
    trayZ,
    board: { x: boardX, y: boardY, z: trayZ + STANDOFF + ATX.thickness },
    psu: { x: rearInner + 1, y: floorY + PANEL, z: trayZ + 8 },
    grommets: [-70, -160, -250].map((dy) => ({ x: boardX + ATX.w + 22, y: boardY + dy })),
    topCut: { x0: boardX + 36, x1: boardX + 150, y: boardY + 15 },
    shroudCut: { x0: boardX + 120, x1: frontInner - 80, z: trayZ + 16 },
    bays,
  };
}
