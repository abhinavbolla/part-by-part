// A case, modelled from its catalog dimensions and from what its maker's
// photos show: the front panel and how it is perforated, the closed front
// section, the roof and its ports, the feet, the rear panel with its real
// openings, and the tray and shroud inside. No logos or brand artwork.

import { Group, Mesh, type MeshStandardMaterial, type Object3D } from 'three';

import type { CasePart } from '../../catalog/types.ts';
import { easeInOut, easeOut, seg } from '../anim.ts';
import { FRONT_DEPTH, PANEL, STANDOFF, STANDOFFS, boardLayout, ledgeTop, type CaseLayout, type Ledge } from '../layout.ts';
import { M, box, copies, cyl, fan, glowMat, prism, prismGeometry, rbox, ring } from '../kit.ts';

export interface CaseModel {
  group: Group;
  rotors: Object3D[];
  glow: MeshStandardMaterial[];
  /** Takes out the slot covers a graphics card replaces: `rows` of them from position `first`. */
  openSlots(first: number, rows: number): void;
  /** 0 fitted .. 1 off: the panel on the far side, behind the motherboard tray. */
  backPanel(open: number): void;
}

type Look = NonNullable<CasePart['look']>;

const PLAIN: Look = {
  front: 'mesh', slats: 0, holes: 'slits', frontDepth: 30, frontGap: 0, top: 'mesh', topSolidFront: 30,
  ioAt: 'near', ports: { usbA: 2, usbC: 1, audio: 1 }, reset: false, powerRound: true, feet: 'pads',
  shroud: 'full', rearFan: 120, rearGrille: 'hex', rearVented: false, cableBar: false, pullTab: false,
};

/**
 * Fills a rectangle on a flat face with holes. `face` is the axis the face
 * looks along, `at` the rectangle's centre, and the spans run along the other
 * two axes in x, y, z order.
 */
function perforate(
  parent: Object3D,
  holes: Look['holes'],
  face: 'x' | 'y' | 'z',
  at: [number, number, number],
  spanA: number,
  spanB: number,
): void {
  const material = M.vent;
  let [pitchA, pitchB] = holes === 'slits' ? [21, 9] : holes === 'rounds' ? [10, 8.7] : holes === 'fine' ? [6.4, 6.4] : [12.5, 10.5];
  // Keep very large panels from needing thousands of holes.
  const crowd = Math.sqrt((spanA / pitchA) * (spanB / pitchB) / 1500);
  if (crowd > 1) {
    pitchA *= crowd;
    pitchB *= crowd;
  }
  const cols = Math.max(1, Math.floor(spanA / pitchA));
  const rows = Math.max(1, Math.floor(spanB / pitchB));
  const size = holes === 'slits' ? 13 : holes === 'rounds' ? pitchA * 0.62 : holes === 'fine' ? pitchA * 0.46 : pitchA * 0.86;
  copies(parent, cols * rows, material, (dummy, i) => {
    const [col, row] = [i % cols, Math.floor(i / cols)];
    const a = -spanA / 2 + pitchA * (col + 0.5) + (row % 2 ? pitchA * 0.25 : -pitchA * 0.25);
    const b = -spanB / 2 + pitchB * (row + 0.5);
    const flip = (col + row) % 2 ? 1 : -1;
    if (face === 'x') {
      dummy.position.set(at[0], at[1] + b, at[2] + a);
      if (holes === 'slits') dummy.scale.set(0.5, 3.2, size);
      else if (holes === 'fine') {
        dummy.rotation.x = Math.PI / 4;
        dummy.scale.set(0.5, size, size);
      } else {
        dummy.rotation.set(holes === 'triangles' ? (flip * Math.PI) / 2 : 0, 0, Math.PI / 2);
        dummy.scale.set(size, 0.5, size);
      }
    } else if (face === 'y') {
      dummy.position.set(at[0] + a, at[1], at[2] + b);
      if (holes === 'slits') dummy.scale.set(size, 0.5, 3.2);
      else if (holes === 'fine') {
        dummy.rotation.y = Math.PI / 4;
        dummy.scale.set(size, 0.5, size);
      } else {
        dummy.rotation.set(0, holes === 'triangles' ? (flip * Math.PI) / 2 + Math.PI / 2 : 0, 0);
        dummy.scale.set(size, 0.5, size);
      }
    } else {
      dummy.position.set(at[0] + a, at[1] + b, at[2]);
      if (holes === 'slits') dummy.scale.set(size, 3.2, 0.5);
      else if (holes === 'fine') {
        dummy.rotation.z = Math.PI / 4;
        dummy.scale.set(size, size, 0.5);
      } else {
        dummy.rotation.order = 'ZYX';
        dummy.rotation.set(Math.PI / 2, 0, holes === 'triangles' ? (flip * Math.PI) / 2 + Math.PI / 2 : 0);
        dummy.scale.set(size, 0.5, size);
      }
    }
  }, holes === 'slits' || holes === 'fine' ? 'box' : holes === 'rounds' ? 'hex' : 'tri');
}

const rect = (a0: number, a1: number, b0: number, b1: number): [number, number][] =>
  [[a0, b0], [a1, b0], [a1, b1], [a0, b1]];

/**
 * Where the stack of front fans starts. Usually just above the shroud; a case
 * with more fans than fit there carries them down in front of it, as the real
 * ones do.
 */
function frontFansFrom(pcCase: CasePart, lay: CaseLayout): number {
  const tall = pcCase.includedFans.front.reduce((sum, size) => sum + Math.min(size, lay.W - 30) + 4, 0);
  // Beside a ledge, the stack starts where the ledge is low at the front
  if (lay.ledge) return Math.max(lay.floorY + PANEL + 6, Math.min(lay.ledge.frontY + 4, lay.H - PANEL - 10 - tall));
  return Math.max(lay.floorY + PANEL + 6, Math.min(lay.shroudTopY + 12, lay.H - PANEL - 10 - tall));
}

/** The ledge's top edge from the rear to the front, as points in (x, y). */
function ledgeLine(ledge: Ledge, x0: number, x1: number): [number, number][] {
  const points: [number, number][] = [[x0, ledge.rearY]];
  for (let i = 0; i <= 12; i++) {
    const x = ledge.slopeX0 + ((ledge.slopeX1 - ledge.slopeX0) * i) / 12;
    points.push([x, ledgeTop(ledge, x)]);
  }
  points.push([x1, ledge.frontY]);
  return points;
}

/** A runner's outline in (x, y), from its outer face inward, arched on the inside. */
function runnerOutline(deep: number, tall: number): [number, number][] {
  const r = Math.min(deep * 0.62, tall * 0.6);
  const arc = Array.from({ length: 9 }, (_, i): [number, number] => {
    const angle = Math.PI - (i / 8) * (Math.PI / 2);
    return [deep + r * Math.cos(angle), r * Math.sin(angle)];
  });
  return [[0, 0], ...arc, [deep, tall], [0, tall]];
}

export function buildCase(pcCase: CasePart, lay: CaseLayout): CaseModel {
  const group = new Group();
  const look = pcCase.look ?? PLAIN;
  const { L, W, H, rearX, frontX, floorY, shroudTopY, trayZ, rearInner, frontInner } = lay;
  const atx = boardLayout('ATX');
  const bodyH = H - floorY;
  const midY = floorY + bodyH / 2;
  const boardZ = lay.board.z;

  // ---- what it stands on ----------------------------------------------------
  if (lay.ledge) {
    // Two runners across the raised half; the far half, round the power supply, comes down to the base
    const span = W / 2 - lay.ledge.z;
    const outline = runnerOutline(38, floorY);
    prism(group, outline, span, M.black, rearX, 0, lay.ledge.z);
    prism(group, outline.map(([x, y]): [number, number] => [-x, y]).reverse(), span, M.black, frontX - FRONT_DEPTH, 0, lay.ledge.z);
  } else if (look.feet === 'bars') {
    for (const sx of [-1, 1]) box(group, 34, floorY, W - 24, M.black, sx * (L / 2 - 46), floorY / 2, 0);
  } else if (look.feet === 'wedges') {
    // Two legs across the width, wider where they meet the case.
    for (const sx of [-1, 1]) {
      prism(group, [[-22, 0], [22, 0], [32, floorY], [-32, floorY]], W - 8, M.black, sx * (L / 2 - 44), 0, -(W - 8) / 2);
    }
  } else if (look.feet === 'rounds') {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        cyl(group, 16, floorY - 4, M.black, 'y', sx * (L / 2 - 42), floorY / 2 + 2, sz * (W / 2 - 30));
        cyl(group, 17.5, 4, M.brass, 'y', sx * (L / 2 - 42), 2, sz * (W / 2 - 30));
      }
    }
  } else {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        rbox(group, 46, floorY, 22, 4, M.black, sx * (L / 2 - 50), floorY / 2, sz * (W / 2 - 22));
      }
    }
  }

  // ---- shell: floor, roof, far side, front ---------------------------------
  if (lay.ledge) {
    // A raised, perforated floor between the ledge and the glass, marked for three
    // 120 mm fans; the far half's floor is at the base
    const ledgeZ = lay.ledge.z;
    const wide = W / 2 - ledgeZ;
    box(group, L, PANEL, wide, M.caseOuter, 0, floorY + PANEL / 2, ledgeZ + wide / 2);
    box(group, L, PANEL, W / 2 + ledgeZ, M.caseOuter, 0, PANEL / 2, (ledgeZ - W / 2) / 2);
    const stripLen = frontInner - rearInner - 24;
    const stripZ = ledgeZ + wide / 2;
    box(group, stripLen, 0.6, wide - 20, M.caseInner, (rearInner + frontInner) / 2, floorY + PANEL + 0.1, stripZ);
    perforate(group, look.holes, 'y', [(rearInner + frontInner) / 2, floorY + PANEL + 0.5, stripZ], stripLen - 8, wide - 28);
    for (let i = -1; i <= 1; i++) {
      const x = (rearInner + frontInner - lay.frontFans) / 2 + i * 125;
      const mark = ring(group, 59, 57, 0.6, M.heatsinkDark, x, floorY + PANEL + 0.6, stripZ);
      mark.rotation.x = -Math.PI / 2;
      for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        cyl(group, 2.4, 0.8, M.slot, 'y', x + dx * 52.5, floorY + PANEL + 0.6, stripZ + dz * 52.5, true);
      }
    }
  } else {
    box(group, L, PANEL, W, M.caseOuter, 0, floorY + PANEL / 2, 0);
  }
  box(group, L, PANEL, W, M.caseOuter, 0, H - PANEL / 2, 0);
  // The far side is a panel of its own: it comes off to show the cables behind the tray.
  // Beside a ledge it comes down to the base.
  const panel = new Group();
  box(panel, L, lay.ledge ? H : bodyH, PANEL, M.caseOuter);
  const panelAt: [number, number, number] = [0, lay.ledge ? H / 2 : midY, -W / 2 + PANEL / 2];
  panel.position.set(...panelAt);
  group.add(panel);
  const vent = look.sidePsu?.vent;
  if (vent) {
    // A perforated band, full height, over the rear, for the supply's fan
    box(panel, vent - 10, H - 20, 0.6, M.caseInner, rearX + 5 + (vent - 10) / 2, 0, -PANEL / 2 - 0.1);
    perforate(panel, look.holes, 'z', [rearX + 5 + (vent - 10) / 2, 0, -PANEL / 2 - 0.5], vent - 18, H - 28);
  }

  // The front: a body section, and on some cases a panel standing off it across a gap
  const panelT = look.frontGap > 0 ? 9 : 0;
  const bodyFront = FRONT_DEPTH - panelT - look.frontGap;
  // A front with a solid foot runs down to the floor
  const foot = look.frontFoot;
  box(group, bodyFront, foot ? H : bodyH, W, M.caseOuter, frontX - FRONT_DEPTH + bodyFront / 2, foot ? H / 2 : midY, 0);
  if (look.frontGap > 0) {
    box(group, look.frontGap, bodyH - 30, W - 30, M.vent, frontX - panelT - look.frontGap / 2, midY, 0);
    box(group, panelT, bodyH - 8, W, M.caseOuter, frontX - panelT / 2, midY + 2, 0);
  }
  // The closed section behind the front panel, along the open side
  const closed = Math.max(0, look.frontDepth - FRONT_DEPTH);
  if (closed > 0) {
    box(group, closed, bodyH, PANEL, M.caseOuter, frontX - FRONT_DEPTH - closed / 2, midY, W / 2 - PANEL / 2);
  }
  // Rim along the top of the open side
  box(group, L - FRONT_DEPTH - closed, 10, PANEL, M.caseOuter, rearX + (L - FRONT_DEPTH - closed) / 2, H - PANEL - 5, W / 2 - PANEL / 2);

  // Front face
  const frontTall = foot ? H - foot - 27 : bodyH - (look.front === 'slats' ? 34 : 54);
  const frontWide = W - (look.front === 'slats' ? 22 : 34);
  const frontY = foot ? foot + frontTall / 2 : midY;
  if (look.front === 'slats' && look.slats > 1) {
    // Slats set into a frame that stands proud of the body, over a dark mesh
    box(group, 1, frontTall, frontWide, M.vent, frontX + 0.3, midY, 0);
    const rim = 11;
    const [edgeZ, edgeY] = [(W - frontWide) / 2, (bodyH - frontTall) / 2];
    for (const side of [-1, 1]) {
      box(group, rim, bodyH, edgeZ, M.caseOuter, frontX + rim / 2, midY, side * (W / 2 - edgeZ / 2));
      box(group, rim, edgeY, frontWide, M.caseOuter, frontX + rim / 2, midY + side * (bodyH / 2 - edgeY / 2), 0);
    }
    const pitch = frontWide / look.slats;
    copies(group, look.slats, M.caseOuter, (dummy, i) => {
      dummy.position.set(frontX + 4.5, midY, -frontWide / 2 + pitch * (i + 0.5));
      dummy.scale.set(8, frontTall - 3, pitch * 0.52);
    });
  } else if (look.front === 'mesh') {
    box(group, 0.6, frontTall, frontWide, M.caseInner, frontX + 0.2, frontY, 0);
    perforate(group, look.holes, 'x', [frontX + 0.7, frontY, 0], frontWide - 8, frontTall - 8);
    if (look.holes === 'fine') {
      // A mesh this fine shows the intake fans behind it
      let y = frontFansFrom(pcCase, lay);
      for (const size of pcCase.includedFans.front) {
        const fitted = Math.min(size, W - 30);
        for (const radius of [fitted / 2 - 2, fitted * 0.19]) {
          const hint = ring(group, radius, radius - 2.4, 0.6, M.caseInner, frontX + 1, y + fitted / 2, 0);
          hint.rotation.y = Math.PI / 2;
        }
        y += fitted + 4;
      }
    }
  } else if (look.front === 'glass') {
    box(group, 1, frontTall, frontWide, M.label, frontX + 0.3, midY, 0);
  } else {
    for (const sz of [-1, 1]) box(group, 1, frontTall, 5, M.vent, frontX + 0.3, midY, sz * (W / 2 - 9));
  }

  // ---- roof ------------------------------------------------------------------
  const solid = Math.max(18, look.topSolidFront);
  const topLen = L - solid - 30;
  const topX = rearX + 18 + topLen / 2;
  // A solid strip along the far edge narrows the perforated part toward the glass
  const topWide = look.topSolidFar ? W - 22 - look.topSolidFar : W - 44;
  const topZ = look.topSolidFar ? W / 2 - 22 - topWide / 2 : 0;
  if (look.top !== 'solid') {
    box(group, topLen, 0.8, topWide, M.caseInner, topX, H + 0.2, topZ);
    if (look.top === 'mesh') perforate(group, look.holes, 'y', [topX, H + 0.7, topZ], topLen - 8, topWide - 8);
    else {
      const rows = Math.floor(topWide / 14);
      copies(group, rows, M.vent, (dummy, i) => {
        dummy.position.set(topX, H + 0.7, -topWide / 2 + 9 + i * 14);
        dummy.scale.set(topLen - 24, 0.5, 5);
      });
    }
  }
  if (look.pullTab) box(group, 16, 1.6, 24, M.brass, rearX - 5, H + 0.8, 0);

  // Power button and ports, in a row on the roof
  const led = glowMat(0x30333a, 0xe9f4ff);
  const items: ('power' | 'usbA' | 'usbC' | 'audio' | 'reset')[] = [
    'power',
    ...Array(look.ports.usbA).fill('usbA'),
    ...Array(look.ports.usbC).fill('usbC'),
    ...Array(look.ports.audio).fill('audio'),
    ...(look.reset ? ['reset' as const] : []),
  ];
  const pitch = 19;
  const run = (items.length - 1) * pitch;
  items.forEach((item, i) => {
    // `along` runs the length of the row; the row lies across the front or down the far edge.
    const along = i * pitch;
    const far = look.ioAt === 'far';
    const x = far ? frontX - 26 - along : frontX - Math.max(14, solid / 2);
    const z = far ? -W / 2 + (look.topSolidFar ? look.topSolidFar / 2 : 15) : look.ioAt === 'centre' ? run / 2 - along : W / 2 - 26 - along;
    const y = H + 0.5;
    if (item === 'power') {
      if (look.powerRound) {
        cyl(group, 7, 1.2, M.brass, 'y', x, y, z);
        cyl(group, 2.2, 1.6, led, 'y', x, y + 0.2, z, true);
      } else {
        box(group, far ? 15 : 9, 1.2, far ? 9 : 15, M.black, x, y, z);
        box(group, far ? 5 : 1.4, 1.5, far ? 1.4 : 5, led, x, y + 0.1, z);
      }
    } else if (item === 'audio') {
      cyl(group, 3, 1, M.slot, 'y', x, y, z, true);
    } else {
      const wide = item === 'usbA' ? 13 : item === 'usbC' ? 9 : 7;
      const deep = item === 'usbA' ? 5.6 : item === 'usbC' ? 3.2 : 4;
      box(group, far ? wide : deep, 1, far ? deep : wide, M.slot, x, y, z);
    }
  });

  // ---- inside: tray, cut-outs, cable bar, standoffs -------------------------
  const trayLen = frontInner - rearInner;
  const trayX = (frontInner + rearInner) / 2;
  if (lay.ledge) {
    // The tray only above the ledge
    const outline: [number, number][] = [...ledgeLine(lay.ledge, rearInner, frontInner), [frontInner, H - PANEL], [rearInner, H - PANEL]];
    prism(group, outline, 1.5, M.caseInner, 0, 0, trayZ - 1.5);
  } else {
    box(group, trayLen, bodyH - PANEL * 2, 1.5, M.caseInner, trayX, midY, trayZ - 0.75);
  }
  box(group, 130, 120, 0.5, M.vent, lay.board.x + atx.socket.u, lay.board.y - atx.socket.v, trayZ + 0.1);
  for (const grommet of lay.grommets) rbox(group, 14, 62, 1, 0.4, M.vent, grommet.x, grommet.y, trayZ + 0.3);
  const cutLen = lay.topCut.x1 - lay.topCut.x0;
  rbox(group, cutLen, 12, 1, 0.4, M.vent, lay.topCut.x0 + cutLen / 2, lay.topCut.y, trayZ + 0.3);
  if (look.cableBar) {
    // Cables run behind this cover instead of through open grommets.
    const barX = lay.grommets[0].x + 26;
    box(group, 30, atx.h - 26, 16, M.caseOuter, barX, lay.board.y - atx.h / 2, trayZ + 8);
    box(group, 2, atx.h - 26, 16, M.heatsinkDark, barX - 16, lay.board.y - atx.h / 2, trayZ + 8);
  }
  for (const spot of STANDOFFS) {
    cyl(group, 3, STANDOFF, M.brass, 'z', lay.board.x + spot.u, lay.board.y - spot.v, trayZ + STANDOFF / 2, true);
  }
  // The tray's other face, seen with the far panel off: the same openings, the
  // open end of the power-supply chamber, and straps over the cable run
  const backZ = trayZ - 1.8;
  box(group, 130, 120, 0.5, M.vent, lay.board.x + atx.socket.u, lay.board.y - atx.socket.v, backZ);
  for (const grommet of lay.grommets) rbox(group, 14, 62, 1, 0.4, M.vent, grommet.x, grommet.y, backZ);
  rbox(group, cutLen, 12, 1, 0.4, M.vent, lay.topCut.x0 + cutLen / 2, lay.topCut.y, backZ);
  const { chamber } = lay;
  if (!lay.ledge) {
    box(group, chamber.x1 - chamber.x0, chamber.y1 - chamber.y0, 0.5, M.vent,
      (chamber.x0 + chamber.x1) / 2, (chamber.y0 + chamber.y1) / 2, backZ);
  }
  const strap = (x: number, y: number, across: boolean): void => {
    const [w, h] = across ? [12, 46] : [46, 12];
    box(group, w, h, 1.2, M.black, x, y, trayZ - 16);
    for (const side of [-1, 1]) {
      box(group, across ? 12 : 1.2, across ? 1.2 : 12, 15, M.black,
        x + (across ? 0 : side * 22.4), y + (across ? side * 22.4 : 0), trayZ - 8.5);
    }
  };
  const trunkX = lay.grommets[0].x;
  for (const dy of [-116, -206]) strap(trunkX, lay.board.y + dy, false);
  strap(trunkX, (lay.grommets[2].y - 31 + chamber.y1) / 2, false);
  strap((lay.topCut.x1 + trunkX) / 2 + 6, lay.topCut.y - 16, true);

  // ---- rear panel: one plate with the real openings cut through it ----------
  // Drawn in (z, y) and turned to face the back: the port opening, seven slots,
  // and the power-supply opening are holes; the fan vent is stamped into it.
  const firstRow = atx.pcie.rows[0].v - 20.32;
  const slotY = (i: number): number => lay.board.y - firstRow - i * 20.32 - 4;
  const slotZ: [number, number] = [boardZ - 3, boardZ + 104];
  const { psuHole } = lay;
  const holes: [number, number][][] = [
    rect(boardZ - 2, boardZ + 43, lay.board.y - 160, lay.board.y - 6),
    ...Array.from({ length: pcCase.expansionSlots }, (_, i) => rect(slotZ[0], slotZ[1], slotY(i) - 6.5, slotY(i) + 6.5)),
    rect(psuHole.z0, psuHole.z1, psuHole.y0, psuHole.y1),
  ];
  // Beside a ledge, the far half of the plate comes down to the base
  const plate: [number, number][] = lay.ledge
    ? [[-W / 2, 0], [lay.ledge.z, 0], [lay.ledge.z, floorY], [W / 2, floorY], [W / 2, H], [-W / 2, H]]
    : rect(-W / 2, W / 2, floorY, H);
  const rear = new Mesh(prismGeometry(plate, PANEL, holes), M.caseOuter);
  rear.rotation.y = -Math.PI / 2;
  rear.position.x = rearX + PANEL;
  group.add(rear);

  // Slot covers, each a vented strip; a graphics card takes the place of some
  const covers: Group[] = Array.from({ length: pcCase.expansionSlots }, (_, i) => {
    const cover = new Group();
    box(cover, 1.2, 12.4, slotZ[1] - slotZ[0] - 1, M.heatsinkDark, rearX + PANEL / 2, slotY(i), (slotZ[0] + slotZ[1]) / 2);
    for (const z of [0.22, 0.5, 0.78]) {
      box(cover, 1.6, 4.6, 22, M.vent, rearX + PANEL / 2, slotY(i), slotZ[0] + (slotZ[1] - slotZ[0]) * z);
    }
    group.add(cover);
    return cover;
  });

  // The exhaust vent, stamped on both faces of the panel
  const grille = W / 2 - 14 - (boardZ + 52);
  const grilleZ = boardZ + 52 + grille / 2;
  const ventR = Math.min(look.rearFan / 2 - 2, grille / 2 - 1);
  const ventY = lay.board.y - 78;
  for (const x of [rearX - 0.2, rearInner + 0.2]) {
    if (look.rearGrille === 'hex') {
      const pitchZ = 11;
      const pitchY = 9.5;
      const cells: [number, number][] = [];
      for (let row = -8; row <= 8; row++) {
        for (let col = -8; col <= 8; col++) {
          const z = col * pitchZ + (row % 2 ? pitchZ / 2 : 0);
          const y = row * pitchY;
          if (Math.hypot(z, y) < ventR - 3) cells.push([z, y]);
        }
      }
      copies(group, cells.length, M.vent, (dummy, i) => {
        dummy.position.set(x, ventY + cells[i][1], grilleZ + cells[i][0]);
        dummy.rotation.set(0, 0, Math.PI / 2);
        dummy.scale.set(8.4, 0.5, 8.4);
      }, 'hex');
    } else {
      const rows = Math.floor((ventR * 2) / 9);
      copies(group, rows * 4, M.vent, (dummy, i) => {
        dummy.position.set(x, ventY - ventR + 5 + Math.floor(i / 4) * 9, grilleZ - ventR + 15 + (i % 4) * ((ventR * 2 - 30) / 3));
        dummy.scale.set(0.5, 3.6, 20);
      });
    }
  }
  if (look.rearVented) {
    // Perforation beside the slots, on the panel's outer face
    const free = W / 2 - 12 - (slotZ[1] + 8);
    if (free > 14) perforate(group, 'slits', 'x', [rearX - 0.2, (slotY(0) + slotY(pcCase.expansionSlots - 1)) / 2, slotZ[1] + 8 + free / 2], free, 20.32 * pcCase.expansionSlots - 8);
  }
  // Thumbscrews that hold the side panels
  for (const sz of [-1, 1]) {
    for (const y of [floorY + bodyH * 0.22, floorY + bodyH * 0.78]) {
      cyl(group, 4.5, 6, M.steel, 'x', rearX - 3, y, sz * (W / 2 - 7), true);
    }
  }

  // ---- PSU shroud ------------------------------------------------------------
  // A top plate that stops short of the front (room for a radiator), a slot
  // along the tray for cables, and a side face over the front half only: the
  // real shroud is closed along the whole side, and is cut away here so the
  // power supply can be seen going in.
  const shroudDepth = W / 2 - trayZ;
  const shroudLen = trayLen - 70;
  const slotLen = lay.shroudCut.x1 - lay.shroudCut.x0;
  if (look.shroud !== 'none') {
    box(group, shroudLen, 2, shroudDepth, M.caseInner, rearInner + shroudLen / 2, shroudTopY - 1, trayZ + shroudDepth / 2);
    rbox(group, slotLen, 0.6, 14, 0.2, M.vent, lay.shroudCut.x0 + slotLen / 2, shroudTopY + 0.2, lay.shroudCut.z);
  }
  const sideLen = trayLen * 0.5;
  const sideTall = shroudTopY - floorY - PANEL;
  if (look.shroud !== 'none') {
    box(group, sideLen, sideTall, 2, M.caseInner, frontInner - sideLen / 2, (shroudTopY + floorY + PANEL) / 2, W / 2 - 4);
  }
  if (look.shroud === 'vented') {
    perforate(group, look.holes, 'z', [frontInner - sideLen / 2, (shroudTopY + floorY + PANEL) / 2, W / 2 - 2.8], sideLen - 20, sideTall - 16);
    perforate(group, look.holes, 'y', [rearInner + shroudLen * 0.36, shroudTopY + 0.3, trayZ + shroudDepth * 0.62], shroudLen * 0.5, shroudDepth * 0.5);
  }
  for (const bay of lay.bays) {
    if (bay.face === 'up') rbox(group, 104, 1, 74, 0.3, M.heatsinkDark, bay.x, shroudTopY + 0.4, bay.z);
  }

  // ---- the ledge over a power supply on its side ---------------------------
  // Its top (level, a curve down, low at the front) and its face toward the
  // glass; behind it, open to the far side, the space the supply stands in.
  if (lay.ledge) {
    const ledge = lay.ledge;
    const line = ledgeLine(ledge, rearInner, frontInner);
    const deep = ledge.z - trayZ;
    const sheet: [number, number][] = [...line, ...line.map(([x, y]): [number, number] => [x, y - 2]).reverse()];
    prism(group, sheet, deep, M.caseInner, 0, 0, trayZ - 1.5);
    prism(group, [[rearInner, 0], ...line, [frontInner, 0]], 1.5, M.caseInner, 0, 0, ledge.z - 1.5);
    rbox(group, slotLen, 0.6, 14, 0.2, M.vent, lay.shroudCut.x0 + slotLen / 2, ledge.rearY + 0.2, lay.shroudCut.z);
    // The drive plate on the back of the tray, over part of the CPU cut-out
    const plated = lay.bays.filter((bay) => bay.face === 'back');
    if (plated.length) {
      const ys = plated.map((bay) => bay.y);
      const [y0, y1] = [Math.min(...ys) - 50, Math.max(...ys) + 50];
      rbox(group, 150, y1 - y0, 1, 0.4, M.caseInner, plated[0].x, (y0 + y1) / 2, trayZ - 2);
      for (const bay of plated) rbox(group, 104, 74, 0.6, 0.3, M.heatsinkDark, bay.x, bay.y, trayZ - 2.8);
    }
  }

  // ---- fans that ship with the case -----------------------------------------
  const rotors: Object3D[] = [];
  let fanY = frontFansFrom(pcCase, lay);
  for (const size of pcCase.includedFans.front) {
    const fitted = Math.min(size, W - 30);
    const intake = fan(group, fitted, 25, fitted >= 140 ? 9 : 7);
    intake.group.rotation.y = -Math.PI / 2;
    intake.group.position.set(frontInner - 13, fanY + fitted / 2, 0);
    rotors.push(intake.rotor);
    fanY += fitted + 4;
  }
  for (const size of pcCase.includedFans.rear) {
    const fitted = Math.min(size, grille - 2, 142);
    const exhaust = fan(group, fitted, 25);
    exhaust.group.rotation.y = Math.PI / 2;
    exhaust.group.position.set(rearInner + 13.5, ventY, grilleZ);
    rotors.push(exhaust.rotor);
  }
  pcCase.includedFans.top.forEach((size, i) => {
    const vent = fan(group, size, 25);
    vent.group.rotation.x = Math.PI / 2;
    vent.group.position.set(frontInner - 20 - size / 2 - i * (size + 4), H - PANEL - 13, W / 2 - 14 - size / 2);
    rotors.push(vent.rotor);
  });

  return {
    group,
    rotors,
    glow: [led],
    openSlots(first, rows) {
      covers.forEach((cover, i) => {
        cover.visible = !(i >= first && i < first + rows);
      });
    },
    backPanel(open) {
      // It slides toward the rear to unhook, then comes away from the case
      const away = easeInOut(seg(open, 0.22, 1));
      panel.position.set(panelAt[0] - 18 * easeInOut(seg(open, 0, 0.3)), panelAt[1], panelAt[2] - 240 * away);
      panel.scale.setScalar(0.55 + 0.45 * easeOut(seg(1 - open, 0, 0.2)));
      panel.visible = open < 0.999;
    },
  };
}
