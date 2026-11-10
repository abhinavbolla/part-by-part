// A generic ATX motherboard. The group's origin is the top-rear corner of the
// PCB's top surface; features sit at (u, -v) with z out of the board.

import { Group, type Object3D } from 'three';

import type { MotherboardPart } from '../../catalog/types.ts';
import { driveScrew, easeInOut, seg, travel, type Travel } from '../anim.ts';
import { BOARD, type CaseLayout } from '../layout.ts';
import { M, box, cyl, glowMat, rbox, screw } from '../kit.ts';
import type { Fixtures, PartModel } from './types.ts';

export interface BoardModel extends PartModel, Fixtures {}

export function buildBoard(_part: MotherboardPart, lay: CaseLayout): BoardModel {
  const group = new Group();
  const { w, h, thickness, socket, dimm, m2, pcie } = BOARD;

  box(group, w, h, thickness, M.pcb, w / 2, -h / 2, -thickness / 2);

  // Rear I/O shroud and the heatsinks around the socket
  rbox(group, 44, 150, 38, 3, M.heatsinkDark, 22, -87, 19);
  rbox(group, 20, 112, 26, 2, M.heatsink, 60, -94, 13);
  rbox(group, 96, 20, 24, 2, M.heatsink, 124, -20, 12);
  for (let i = 0; i < 8; i++) {
    box(group, 8, 8, 7, M.slotAlt, 80 + i * 10, -38, 3.5);
    box(group, 8, 8, 7, M.slotAlt, 78, -50 - i * 11.5, 3.5);
  }

  // CPU socket: body, contacts, retention frame on a hinge, and its lever
  box(group, 50, 50, 3.5, M.slot, socket.u, -socket.v, 1.75);
  box(group, 38, 38, 0.5, M.gold, socket.u, -socket.v, 3.6);
  const frame = new Group();
  frame.position.set(socket.u, -(socket.v - 31), 6.9);
  box(frame, 54, 5, 1.2, M.steel, 0, -2.5, 0);
  box(frame, 54, 5, 1.2, M.steel, 0, -59.5, 0);
  box(frame, 5, 62, 1.2, M.steel, -24.5, -31, 0);
  box(frame, 5, 62, 1.2, M.steel, 24.5, -31, 0);
  group.add(frame);
  const lever = new Group();
  lever.position.set(socket.u + 31, -(socket.v + 32), 6.5);
  box(lever, 2, 66, 2, M.steel, 0, 33, 0);
  box(lever, 7, 2, 2, M.steel, 2.5, 66, 0);
  group.add(lever);

  // DIMM slots with a clip at each end
  const clips: { top: Group; bottom: Group }[] = [];
  dimm.u.forEach((u, i) => {
    const material = i % 2 === 1 ? M.slotAlt : M.slot;
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

  // Power sockets
  box(group, 10, 52, 13, M.slot, 233, -86, 6.5);
  box(group, 19, 10, 13, M.slot, 62, -7, 6.5);
  box(group, 19, 10, 13, M.slot, 84, -7, 6.5);

  // M.2: the top slot is open for the drive, the lower one sits under a cover
  box(group, 4, 22, 4.6, M.slot, m2.u - 2, -m2.v, 2.3);
  cyl(group, 2.4, m2.z, M.brass, 'z', m2.u + 78, -m2.v, m2.z / 2, true);
  rbox(group, 92, 26, 5, 1.5, M.heatsink, 138, -207, 5.5);

  // Expansion slots: x16, x1, x16
  const latch = new Group();
  latch.position.set(pcie.u + pcie.len + 1, -pcie.v[0], 2);
  box(latch, 6, 7.5, 13, M.label, 3, 0, 6);
  group.add(latch);
  box(group, pcie.len, 7.5, pcie.height, M.steel, pcie.u + pcie.len / 2, -pcie.v[0], pcie.height / 2);
  box(group, pcie.len - 4, 2.2, 0.6, M.slot, pcie.u + pcie.len / 2, -pcie.v[0], pcie.height + 0.1);
  box(group, 25, 7.5, pcie.height, M.slot, pcie.u + 12.5, -pcie.v[1], pcie.height / 2);
  box(group, pcie.len, 7.5, pcie.height, M.slot, pcie.u + pcie.len / 2, -pcie.v[2], pcie.height / 2);

  // Chipset heatsink, SATA ports, battery, headers along the bottom edge
  rbox(group, 58, 60, 10, 2, M.heatsinkDark, 206, -238, 5);
  box(group, 8, 30, 8, M.slot, 240, -205, 4);
  box(group, 8, 30, 8, M.slot, 240, -272, 4);
  cyl(group, 10, 3, M.steel, 'z', 150, -246, 1.5);
  for (let i = 0; i < 6; i++) box(group, 22, 5, 8, M.slot, 24 + i * 34, -299, 4);
  box(group, 12, 5, 8, M.slot, 150, -8, 4);
  box(group, 12, 5, 8, M.slot, 200, -8, 4);

  // Debug light near the memory slots
  const led = glowMat(0x2a2d32, 0xffffff);
  box(group, 14, 3, 1.2, led, 228, -150, 0.6);

  const screws: Object3D[] = BOARD.holes.map(([u, v]) => screw(group, u, -v, 0));

  const seat: Travel = {
    seat: [lay.board.x, lay.board.y, lay.board.z],
    hover: [0, 0, 62],
    enter: [40, 30, 300],
  };

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
        const start = 0.64 + i * 0.034;
        driveScrew(item, p, start, start + 0.085, 0);
      });
    },
    socket(open) {
      lever.rotation.x = easeInOut(seg(open, 0, 0.45)) * 1.75;
      lever.position.x = BOARD.socket.u + 31 + seg(open, 0, 0.2) * 4;
      frame.rotation.x = -easeInOut(seg(open, 0.3, 1)) * 1.95;
    },
    dimm(open) {
      for (const index of [1, 3]) {
        clips[index].top.rotation.x = -open * 0.55;
        clips[index].bottom.rotation.x = open * 0.55;
      }
    },
    latch(open) {
      latch.rotation.y = open * 0.6;
    },
  };
  model.setProgress(1, true);
  return model;
}
