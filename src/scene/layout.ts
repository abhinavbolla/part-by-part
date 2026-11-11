// Where things are. Case frame: x runs rear (-) to front (+), y is up from
// the bench, z points out of the open side toward the viewer. Board frame:
// origin at the top-rear corner of the PCB's top surface, u along +x,
// v along -y, z out of the board.
//
// Each form factor has a usual arrangement of board features. The outlines
// and the 20.32 mm slot pitch follow the standards; the rest of that
// arrangement is approximate. A board whose own arrangement the catalog
// records (`look`) replaces the socket, slots, M.2 sockets, CPU power sockets
// and coin cell with its own.

import type { CasePart, FormFactor, MotherboardPart } from '../catalog/types.ts';

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

/** One expansion slot. `len` and `steel` are set when the board's own arrangement is known. */
export interface SlotRow extends Spot {
  x16: boolean;
  len?: number;
  steel?: boolean;
}

export interface BoardLayout {
  formFactor: FormFactor;
  w: number;
  h: number;
  thickness: number;
  socket: Spot & { top: number };
  /** DIMM slot centre lines along u; `pair` are the slots a two-module kit uses. */
  dimm: { u: number[]; v0: number; len: number; height: number; pair: number[] };
  /** M.2 connectors in fill order. The drive runs toward +u from each unless `dir` is -1; `rise` lifts a socket that sits on something. */
  m2: (Spot & { dir?: 1 | -1; rise?: number })[];
  m2z: number;
  /** Expansion slot rows; the graphics card uses the first. */
  pcie: { u: number; len: number; height: number; rows: SlotRow[] };
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

const SLOT_LENGTH = { x16: 89, x4: 39, x1: 25 };
const known = new Map<string, BoardLayout>();

/**
 * Where things are on a board. A form factor gives the generic arrangement; a
 * board whose own arrangement is recorded gets its slots and M.2 sockets where
 * they really are.
 */
export function boardLayout(board: MotherboardPart | FormFactor): BoardLayout {
  const formFactor = typeof board === 'string' ? board : board.formFactor;
  const base = formFactor === 'Mini-ITX' ? ITX : formFactor === 'mATX' ? MATX : ATX;
  if (typeof board === 'string' || !board.look) return base;
  let layout = known.get(board.id);
  if (!layout) {
    const first = base.pcie.rows[0];
    const look = board.look;
    // The usual fan header sits where these boards have a heatsink; it goes above the memory instead
    const taken = look.eps.some(([u]) => Math.abs(u - 196) < 22);
    layout = {
      ...base,
      socket: { ...base.socket, u: look.socket[0], v: look.socket[1] },
      eps: look.eps.map(([u, v]) => ({ u, v })),
      fanHeader: formFactor === 'Mini-ITX' ? base.fanHeader : { u: taken ? 232 : 196, v: 8 },
      sata: { u: base.sata.u, v: look.sataAt ?? base.sata.v },
      battery: look.battery ? { u: look.battery[0], v: look.battery[1] } : base.battery,
      m2: look.m2.length ? look.m2.map(([u, v, dir, rise]) => ({ u, v, dir, rise })) : base.m2,
      pcie: {
        ...base.pcie,
        rows: [
          { ...first, steel: true },
          ...board.look.slots.map((slot) => ({
            u: first.u,
            v: first.v + slot.row * SLOT_PITCH,
            x16: slot.size === 'x16',
            len: SLOT_LENGTH[slot.size],
            steel: slot.steel,
          })),
        ],
      },
    };
    known.set(board.id, layout);
  }
  return layout;
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
