// A generic motherboard drawn from a per-form-factor layout. The group's
// origin is the top-rear corner of the PCB's top surface; features sit at
// (u, -v) with z out of the board.

import { Group, type Object3D } from 'three';

import type { MotherboardPart } from '../../catalog/types.ts';
import { driveScrew, easeInOut, seg, travel, type Travel } from '../anim.ts';
import { packageSize, type BoardLayout, type CaseLayout } from '../layout.ts';
import { M, box, cyl, glowMat, rbox, screw } from '../kit.ts';
import type { Fixtures, PartModel } from './types.ts';

export interface BoardModel extends PartModel, Fixtures {}

export function buildBoard(part: MotherboardPart, lay: CaseLayout, bl: BoardLayout): BoardModel {
  const group = new Group();
  const { w, h, thickness, socket, dimm, pcie } = bl;

  box(group, w, h, thickness, M.pcb, w / 2, -h / 2, -thickness / 2);

  // Shrouds and heatsinks
  for (const item of bl.decor) {
    const material = item.tone === 'light' ? M.heatsink : item.tone === 'dark' ? M.heatsinkDark : M.slot;
    if (item.round) rbox(group, item.w, item.h, item.z, item.round, material, item.u, -item.v, item.z / 2);
    else box(group, item.w, item.h, item.z, material, item.u, -item.v, item.z / 2);
  }
  // Chokes along the top of the socket, and down its side where there is room
  for (let i = 0; i < 6; i++) box(group, 8, 8, 7, M.slotAlt, socket.u - 26 + i * 10.4, -(socket.v - 52), 3.5);
  if (bl.formFactor !== 'Mini-ITX') {
    for (let i = 0; i < 8; i++) box(group, 8, 8, 7, M.slotAlt, socket.u - 34, -(socket.v - 45 + i * 11.5), 3.5);
  }

  // CPU socket: body, contacts, retention frame on a hinge, and its lever
  const pkg = packageSize(part.socket);
  const frameW = pkg.w + 14;
  const frameH = pkg.h + 22;
  box(group, pkg.w + 10, pkg.h + 10, 3.5, M.slot, socket.u, -socket.v, 1.75);
  box(group, pkg.w - 2, pkg.h - 2, 0.5, M.gold, socket.u, -socket.v, 3.6);
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
  box(group, 8, 30, 8, M.slot, bl.sata.u, -bl.sata.v, 4);
  for (let u = 24; u < w - 70; u += 34) {
    if (Math.abs(u - bl.frontHeader.u) > 30) box(group, 22, 5, 8, M.slot, u, -(h - 6), 4);
  }

  // M.2 connectors, each with its standoff post
  bl.m2.slice(0, part.m2Slots.length).forEach((spot, i) => {
    box(group, 4, 22, 4.6, M.slot, spot.u - 2, -spot.v, 2.3);
    const reach = Math.min(part.m2Slots[i].maxLength, 80);
    cyl(group, 2.4, bl.m2z, M.brass, 'z', spot.u + reach - 2, -spot.v, bl.m2z / 2, true);
  });

  // Expansion slots, with a latch on the one the graphics card uses
  const latch = new Group();
  pcie.rows.forEach((row, i) => {
    const len = row.x16 ? pcie.len : 25;
    box(group, len, 7.5, pcie.height, i === 0 ? M.steel : M.slot, row.u + len / 2, -row.v, pcie.height / 2);
    if (i === 0) {
      box(group, len - 4, 2.2, 0.6, M.slot, row.u + len / 2, -row.v, pcie.height + 0.1);
      latch.position.set(row.u + len + 1, -row.v, 2);
      box(latch, 6, 7.5, 13, M.label, 3, 0, 6);
      group.add(latch);
    }
  });

  cyl(group, 10, 3, M.steel, 'z', bl.battery.u, -bl.battery.v, 1.5);

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
  };
  model.setProgress(1, true);
  return model;
}
