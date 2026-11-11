// A motherboard. Sockets, slots and headers come from a per-form-factor
// layout; heatsinks, covers, expansion slots and M.2 sockets are the board's
// own where the catalog records them. The group's origin is the top-rear
// corner of the PCB's top surface; features sit at (u, -v) with z out of the
// board.

import { Group, type Object3D } from 'three';

import type { BoardSink, MotherboardPart, RearPort } from '../../catalog/types.ts';
import { driveScrew, easeInOut, seg, travel, type Travel } from '../anim.ts';
import { packageSize, type BoardLayout, type CaseLayout } from '../layout.ts';
import { M, box, copies, cyl, glowMat, prism, rbox, screw } from '../kit.ts';
import type { Fixtures, PartModel } from './types.ts';

export interface BoardModel extends PartModel, Fixtures {}

const USUAL_PORTS: RearPort[][] = [
  ['dp', 'hdmi'], ['usbA', 'usbA'], ['usbA', 'usbA'], ['lan', 'usbA', 'usbA'], ['usbC'],
  ['antenna'], ['antenna'], ['audio', 'audio', 'audio'],
];

/** Each port's size on the panel: along it, and up from the board. */
const PORT: Record<RearPort, [number, number]> = {
  usbA: [14.5, 7.2], usbC: [10, 4.4], hdmi: [15.5, 6.6], dp: [17, 6.2], lan: [16.5, 13.5],
  audio: [11, 10.4], optical: [11, 10.4], antenna: [12, 11], button: [9, 8], ps2: [14, 13], vent: [14, 30],
};

/**
 * The port block: a shield that fills the case's opening, and every port the
 * board has, column by column as on the real panel.
 */
function rearPorts(group: Group, part: MotherboardPart): void {
  const columns = part.rearIo ?? USUAL_PORTS;
  const [top, bottom] = [9, 157];
  const face = -11.6; // inside the thickness of the case's rear panel
  box(group, 0.8, 152, 43, M.heatsinkDark, -10.6, -83, 20.5);

  const widths = columns.map((column) => Math.max(...column.map((port) => PORT[port][0])));
  const gap = 2.5;
  const needed = widths.reduce((sum, wide) => sum + wide + gap, -gap);
  const squeeze = Math.min(1, (bottom - top) / needed);
  const spare = (bottom - top - needed * squeeze) / (columns.length + 1);

  let v = top + spare;
  columns.forEach((column, c) => {
    const across = widths[c] * squeeze;
    const centre = v + across / 2;
    const tall = column.reduce((sum, port) => sum + PORT[port][1] + 1.2, -1.2);
    const fit = Math.min(1, 37 / tall);
    // The housing the ports of this column share, standing on the board
    if (!column.every((port) => port === 'antenna' || port === 'button' || port === 'vent')) {
      box(group, 22, across, tall * fit + 1, M.steel, 1.4, -centre, 2 + (tall * fit + 1) / 2);
    }
    let z = 2.5 + tall * fit;
    for (const port of column) {
      const [wide, high] = [PORT[port][0] * squeeze, PORT[port][1] * fit];
      const mid = z - high / 2;
      z -= high + 1.2 * fit;
      if (port === 'audio') {
        cyl(group, 4.4, 2.4, M.slotAlt, 'x', face, -centre, mid, true);
        cyl(group, 1.8, 2.8, M.slot, 'x', face, -centre, mid, true);
      } else if (port === 'antenna') {
        cyl(group, 4.8, 1.6, M.gold, 'x', face + 0.4, -centre, 26, true);
        cyl(group, 3.1, 9, M.gold, 'x', face - 3, -centre, 26, true);
      } else if (port === 'button') {
        rbox(group, 2.4, Math.min(wide, 6.5), 6.5 * fit, 0.8, M.slotAlt, face, -centre, mid);
      } else if (port === 'ps2') {
        cyl(group, 6.4, 2.4, M.slotAlt, 'x', face, -centre, mid, true);
        cyl(group, 4.8, 2.8, M.slot, 'x', face, -centre, mid, true);
      } else if (port === 'optical') {
        box(group, 2.4, 9 * squeeze, 9 * fit, M.slotAlt, face, -centre, mid);
        box(group, 2.8, 5, 5, M.slot, face, -centre, mid);
      } else if (port === 'vent') {
        for (let i = 0; i < 5; i++) box(group, 1.2, wide - 4, 2.6, M.vent, face + 0.6, -centre, 8 + i * 6);
      } else {
        // A steel rim round a dark mouth; USB-A carries a tongue, the network port its latch notch
        const [mouthW, mouthH] = [wide - 2.2, high - 2];
        box(group, 2.4, wide - 0.8, high - 0.6, M.steel, face, -centre, mid);
        box(group, 2.8, mouthW, mouthH, M.slot, face, -centre, mid);
        if (port === 'usbA') box(group, 3, mouthW - 2, 1.5, M.slotAlt, face, -centre, mid - 0.9);
        if (port === 'lan') box(group, 3, 5 * squeeze, 2.2, M.slot, face, -centre, mid - high / 2 + 0.6);
      }
    }
    v += across + gap * squeeze + spare;
  });
}

/** A rectangle on the board with any of its corners cut off, as points in the board's own (u, -v) plane. */
function sinkOutline(sink: BoardSink): [number, number][] {
  const [u0, v0, u1, v1] = sink.at;
  const points: [number, number][] = [];
  // Round the rectangle anticlockwise as drawn: bottom-left, bottom-right, top-right, top-left
  for (const [name, u, v, du, dv] of [
    ['bl', u0, v1, 1, -1], ['br', u1, v1, -1, -1], ['tr', u1, v0, -1, 1], ['tl', u0, v0, 1, 1],
  ] as [string, number, number, number, number][]) {
    const size = sink.cuts?.find(([corner]) => corner === name)?.[1] ?? 0;
    const by = Math.min(size, (u1 - u0) * 0.45, (v1 - v0) * 0.45);
    if (by <= 0) points.push([u, -v]);
    else if (name === 'bl' || name === 'tr') points.push([u, -(v + dv * by)], [u + du * by, -v]);
    else points.push([u + du * by, -v], [u, -(v + dv * by)]);
  }
  return points;
}

/**
 * Draws one heatsink or cover into `parent`. Positions are measured from the
 * board's top-rear corner, or from `origin` for a cover that hangs on a hinge.
 */
function drawSink(parent: Object3D, sink: BoardSink, origin: [number, number] = [0, 0]): void {
  const [u0, v0, u1, v1] = sink.at;
  const [w, h] = [u1 - u0, v1 - v0];
  const [cu, cv] = [(u0 + u1) / 2 - origin[0], (v0 + v1) / 2 - origin[1]];
  const material = sink.tone === 'light' ? M.heatsink : M.heatsinkDark;
  const style = sink.top;
  const raised = style === 'finsAcross' || style === 'finsDown' || style === 'blocks';
  const tall = sink.tall;
  const body = raised ? tall * (style === 'blocks' ? 0.5 : 0.42) : tall;
  prism(parent, sinkOutline(sink), body, material, -origin[0], origin[1], 0);
  const inset = Math.max(0, ...(sink.cuts ?? []).map(([, size]) => size));
  if (style === 'finsAcross' || style === 'finsDown') {
    // Fins standing on the base, running across the board or down it
    const across = style === 'finsAcross';
    const count = Math.max(2, Math.floor((across ? h : w) / 5));
    const step = ((across ? h : w) - 3) / count;
    copies(parent, count, material, (dummy, i) => {
      const offset = -(across ? h : w) / 2 + 1.5 + step * (i + 0.5);
      if (across) {
        dummy.position.set(cu, -(cv + offset), body + (tall - body) / 2);
        dummy.scale.set(w - 2 - inset * 2, 1.8, tall - body);
      } else {
        dummy.position.set(cu + offset, -cv, body + (tall - body) / 2);
        dummy.scale.set(1.8, h - 2 - inset * 2, tall - body);
      }
    });
  } else if (style === 'blocks') {
    // Chunky blocks in rows, with deep grooves between them
    const [cols, rows] = [Math.max(1, Math.round(w / 23)), Math.max(1, Math.round(h / 23))];
    copies(parent, cols * rows, material, (dummy, i) => {
      const [col, row] = [i % cols, Math.floor(i / cols)];
      dummy.position.set(cu + ((col + 0.5) / cols - 0.5) * (w - 2), -(cv + ((row + 0.5) / rows - 0.5) * (h - 2)), body + (tall - body) / 2);
      dummy.scale.set((w - 2) / cols - 3.5, (h - 2) / rows - 3.5, tall - body);
    });
  } else if (style !== 'flat') {
    // Shallow grooves in the top: straight across, straight down, or on the diagonal
    const diagonal = style === 'slashes';
    const across = style === 'groovesAcross' || (diagonal && w >= h);
    const long = across ? w : h;
    const short = across ? h : w;
    const count = diagonal ? Math.max(2, Math.min(5, Math.floor(long / 22))) : Math.max(2, Math.min(7, Math.floor(short / 7)));
    copies(parent, count, M.slotAlt, (dummy, i) => {
      const spread = (i - (count - 1) / 2) * (diagonal ? 9 : (short - 6) / count);
      if (diagonal) {
        dummy.position.set(cu + (across ? spread : 0), -(cv + (across ? 0 : spread)), tall + 0.1);
        dummy.rotation.z = Math.PI / 4;
        dummy.scale.set(Math.min(short * 0.7, 46), 1.6, 0.5);
      } else {
        dummy.position.set(cu + (across ? 0 : spread), -(cv + (across ? spread : 0)), tall + 0.1);
        dummy.scale.set(across ? long - 10 - inset : 1.4, across ? 1.4 : long - 10 - inset, 0.5);
      }
    });
  } else if (sink.kind === 'm2' || sink.kind === 'chipset') {
    // A plain plate carries a shallow recessed panel
    box(parent, Math.max(4, w - 14 - inset), Math.max(4, h - 8), 0.5, M.slotAlt, cu, -cv, tall + 0.1);
  }
  if (sink.kind === 'm2') {
    for (const end of [-1, 1]) cyl(parent, 1.8, 0.8, M.screw, 'z', cu + end * (w / 2 - 4 - inset * 0.4), -cv, tall + 0.4, true);
  }
}

export function buildBoard(part: MotherboardPart, lay: CaseLayout, bl: BoardLayout): BoardModel {
  const group = new Group();
  const { w, h, thickness, socket, dimm, pcie } = bl;

  box(group, w, h, thickness, M.pcb, w / 2, -h / 2, -thickness / 2);

  // Heatsinks and covers: the board's own where they are recorded, a usual arrangement otherwise
  const sinks = part.look?.sinks ?? [];
  const lids: { hinge: Group; covers: number[]; open: number[]; rest: number }[] = [];
  const M2_FLOOR = 6.4; // a cover sits above the drive, not on the board
  for (const sink of sinks) {
    if (sink.kind === 'm2' && sink.covers?.length) {
      // Hinged along its upper edge, so it can swing up to let a drive in
      const rest = M2_FLOOR + Math.max(0, ...sink.covers.map((socket) => bl.m2[socket]?.rise ?? 0));
      const hinge = new Group();
      hinge.position.set(sink.at[0], -sink.at[1], rest);
      drawSink(hinge, { ...sink, tall: Math.max(2.5, sink.tall - rest) }, [sink.at[0], sink.at[1]]);
      group.add(hinge);
      lids.push({ hinge, covers: sink.covers, open: sink.covers.map(() => 0), rest });
    } else {
      drawSink(group, sink);
    }
  }
  const under = (u: number, v: number): boolean =>
    sinks.some((sink) => u > sink.at[0] - 3 && u < sink.at[2] + 3 && v > sink.at[1] - 3 && v < sink.at[3] + 3);
  for (const item of part.look ? [] : bl.decor) {
    const material = item.tone === 'light' ? M.heatsink : item.tone === 'dark' ? M.heatsinkDark : M.slot;
    if (item.round) rbox(group, item.w, item.h, item.z, item.round, material, item.u, -item.v, item.z / 2);
    else box(group, item.w, item.h, item.z, material, item.u, -item.v, item.z / 2);
    if (item.tone !== 'light') continue;
    const long = Math.max(item.w, item.h);
    const grooves = Math.floor(long / 9);
    copies(group, grooves, M.slotAlt, (dummy, i) => {
      const along = -long / 2 + (long * (i + 0.5)) / grooves;
      if (item.w >= item.h) {
        dummy.position.set(item.u + along, -item.v, item.z + 0.2);
        dummy.scale.set(2.2, item.h - 5, 0.6);
      } else {
        dummy.position.set(item.u, -item.v + along, item.z + 0.2);
        dummy.scale.set(item.w - 5, 2.2, 0.6);
      }
    });
  }

  rearPorts(group, part);
  // Audio capacitors and the codec, in the corner below the slots
  if (bl.formFactor !== 'Mini-ITX') {
    for (let i = 0; i < 5; i++) cyl(group, 3, 8, M.gold, 'z', 12 + i * 8, -(h - 22), 4, true);
    box(group, 9, 9, 1.4, M.chip, 20, -(h - 38), 0.7);
  }
  // Chokes along the top of the socket, and down its side where there is room
  for (let i = 0; i < 6; i++) {
    const [u, v] = [socket.u - 26 + i * 10.4, socket.v - 52];
    if (!under(u, v)) box(group, 8, 8, 7, M.slotAlt, u, -v, 3.5);
  }
  if (bl.formFactor !== 'Mini-ITX') {
    for (let i = 0; i < 8; i++) {
      const [u, v] = [socket.u - 34, socket.v - 45 + i * 11.5];
      if (!under(u, v)) box(group, 8, 8, 7, M.slotAlt, u, -v, 3.5);
    }
  }

  // CPU socket: body, contacts, retention frame on a hinge, and its lever
  const pkg = packageSize(part.socket);
  const frameW = pkg.w + 14;
  const frameH = pkg.h + 22;
  box(group, pkg.w + 10, pkg.h + 10, 3.5, M.slot, socket.u, -socket.v, 1.75);
  box(group, pkg.w - 2, pkg.h - 2, 0.5, M.gold, socket.u, -socket.v, 3.6);
  // The four bolts that hold the socket's frame to the plate behind the board
  for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    cyl(group, 2.6, 2, M.screw, 'z', socket.u + sx * (pkg.w / 2 + 9), -socket.v + sy * (pkg.h / 2 + 13), 1, true);
  }
  const frame = new Group();
  frame.position.set(socket.u, -(socket.v - frameH / 2), 6.9);
  box(frame, frameW, 5, 1.2, M.steel, 0, -2.5, 0);
  box(frame, frameW, 5, 1.2, M.steel, 0, -(frameH - 2.5), 0);
  box(frame, 5, frameH, 1.2, M.steel, -(frameW / 2 - 2.5), -frameH / 2, 0);
  box(frame, 5, frameH, 1.2, M.steel, frameW / 2 - 2.5, -frameH / 2, 0);
  group.add(frame);
  const leverX = socket.u + frameW / 2 + 4;
  const lever = new Group();
  lever.position.set(leverX, -(socket.v + frameH / 2 + 1), 6.5);
  box(lever, 2, frameH + 4, 2, M.steel, 0, (frameH + 4) / 2, 0);
  box(lever, 7, 2, 2, M.steel, 2.5, frameH + 4, 0);
  group.add(lever);

  // DIMM slots with a clip at each end
  const clips: { top: Group; bottom: Group }[] = [];
  dimm.u.slice(0, part.ramSlots).forEach((u, i) => {
    const material = dimm.pair.includes(i) ? M.slotAlt : M.slot;
    box(group, 6.5, dimm.len, dimm.height, material, u, -(dimm.v0 + dimm.len / 2), dimm.height / 2);
    const top = new Group();
    top.position.set(u, -dimm.v0, 3);
    box(top, 6.5, 6, 12, M.label, 0, 3, 5);
    const bottom = new Group();
    bottom.position.set(u, -(dimm.v0 + dimm.len), 3);
    box(bottom, 6.5, 6, 12, M.label, 0, -3, 5);
    group.add(top, bottom);
    clips.push({ top, bottom });
  });

  // Power sockets and headers
  if (bl.atx24.across) box(group, 52, 10, 13, M.slot, bl.atx24.u, -bl.atx24.v, 6.5);
  else box(group, 10, 52, 13, M.slot, bl.atx24.u, -bl.atx24.v, 6.5);
  for (const spot of bl.eps.slice(0, Math.max(1, part.epsConnectors))) {
    box(group, 19, 10, 13, M.slot, spot.u, -spot.v, 6.5);
  }
  box(group, 12, 5, 8, M.slotAlt, bl.fanHeader.u, -bl.fanHeader.v, 4);
  box(group, 24, 5, 8, M.slotAlt, bl.frontHeader.u, -bl.frontHeader.v, 4);
  // SATA ports: stacked in pairs facing off the right edge, any others upright along the bottom
  const sideways = Math.min(part.sataPorts, part.look?.sataEdge ?? 2);
  const pairs = Math.max(1, Math.ceil(sideways / 2));
  for (let i = 0; i < pairs; i++) {
    const v = bl.sata.v + (i - (pairs - 1) / 2) * 19;
    box(group, 12, 16, 9, M.slot, w - 6, -v, 4.5);
    box(group, 0.6, 12, 2, M.slotAlt, w + 0.1, -v, 6.3);
    box(group, 0.6, 12, 2, M.slotAlt, w + 0.1, -v, 2.7);
  }
  const upright = part.look ? part.sataPorts - sideways : 0;
  for (let i = 0; i < upright; i++) box(group, 16, 6, 8, M.slot, w - 62 - i * 19, -(h - 16), 4);
  for (let u = 24; u < w - 70; u += 34) {
    if (Math.abs(u - bl.frontHeader.u) > 30) box(group, 22, 5, 8, M.slot, u, -(h - 6), 4);
  }
  // Pins standing in the fan and front-panel headers
  copies(group, 12, M.gold, (dummy, i) => {
    const header = i < 4 ? bl.fanHeader : bl.frontHeader;
    const start = i < 4 ? -3.9 : -9 - 4 * 2.6;
    dummy.position.set(header.u + start + i * 2.6, -header.v, 8.6);
    dummy.scale.set(0.7, 0.7, 2.4);
  });

  // M.2 connectors, each with its standoff post and the outline of the drive printed on the board
  bl.m2.slice(0, part.m2Slots.length).forEach((spot, i) => {
    const [dir, rise] = [spot.dir ?? 1, spot.rise ?? 0];
    box(group, 4, 22, 4.6, M.slot, spot.u - 2 * dir, -spot.v, rise + 2.3);
    const reach = Math.min(part.m2Slots[i].maxLength, 80);
    cyl(group, 2.4, bl.m2z, M.brass, 'z', spot.u + reach * dir, -spot.v, rise + bl.m2z / 2, true);
    box(group, reach - 4, 22, 0.25, M.slotAlt, spot.u + (reach / 2) * dir, -spot.v, rise + 0.12);
  });

  // Expansion slots, with a latch on the one the graphics card uses
  const latch = new Group();
  pcie.rows.forEach((row, i) => {
    const len = row.len ?? (row.x16 ? pcie.len : 25);
    box(group, len, 7.5, pcie.height, row.steel ?? i === 0 ? M.steel : M.slot, row.u + len / 2, -row.v, pcie.height / 2);
    // The slit the card's edge goes into, with the key that splits it
    if (i > 0) box(group, len - 4, 2.2, 0.6, M.chip, row.u + len / 2, -row.v, pcie.height + 0.1);
    if (len > 30) box(group, 1.6, 7.5, pcie.height + 0.8, M.slotAlt, row.u + 13, -row.v, pcie.height / 2 + 0.4);
    if (i === 0) {
      box(group, len - 4, 2.2, 0.6, M.slot, row.u + len / 2, -row.v, pcie.height + 0.1);
      latch.position.set(row.u + len + 1, -row.v, 2);
      box(latch, 6, 7.5, 13, M.label, 3, 0, 6);
      group.add(latch);
    }
  });

  if (!part.look || part.look.battery) cyl(group, 10, 3, M.steel, 'z', bl.battery.u, -bl.battery.v, 1.5);

  // Debug light
  const led = glowMat(0x2a2d32, 0xffffff);
  box(group, 14, 3, 1.2, led, w - 30, -(h - 16), 0.6);

  const screws: Object3D[] = bl.holes.map((hole) => screw(group, hole.u, -hole.v, 0));

  const seat: Travel = {
    seat: [lay.board.x, lay.board.y, lay.board.z],
    hover: [0, 0, 62],
    enter: [40, 30, 300],
  };
  const span = 0.3 / screws.length;

  const model: BoardModel = {
    group,
    frame: 'case',
    duration: 2.6,
    rotors: [],
    glow: [led],
    setProgress(p) {
      travel(group, p, seat, 0.4, 0.62, easeInOut);
      const swing = 1 - easeInOut(seg(p, 0, 0.36));
      group.rotation.y = -0.38 * swing;
      group.rotation.x = 0.08 * swing;
      screws.forEach((item, i) => {
        const start = 0.64 + i * span;
        driveScrew(item, p, start, start + 0.085, 0);
      });
    },
    socket(open) {
      lever.rotation.x = easeInOut(seg(open, 0, 0.45)) * 1.75;
      lever.position.x = leverX + seg(open, 0, 0.2) * 4;
      frame.rotation.x = -easeInOut(seg(open, 0.3, 1)) * 1.95;
    },
    dimm(open) {
      for (const clip of clips) {
        clip.top.rotation.x = -open * 0.55;
        clip.bottom.rotation.x = open * 0.55;
      }
    },
    latch(open) {
      latch.rotation.y = open * 0.6;
    },
    m2(slot, open) {
      for (const lid of lids) {
        const index = lid.covers.indexOf(slot);
        if (index < 0) continue;
        // A plate over several sockets stays up while any of them is being filled
        lid.open[index] = open;
        const most = Math.max(...lid.open);
        lid.hinge.rotation.x = -easeInOut(most) * 1.25;
        lid.hinge.position.z = lid.rest + easeInOut(most) * 5;
      }
    },
  };
  model.setProgress(1, true);
  return model;
}
