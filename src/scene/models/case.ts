// A mid-tower drawn from the case's outer dimensions, plus the features the
// catalog records for it: what its front and top panels are, where its
// buttons and ports sit, what it stands on. No logos or brand artwork.

import { Group, type MeshStandardMaterial, type Object3D } from 'three';

import type { CasePart } from '../../catalog/types.ts';
import { FRONT_DEPTH, PANEL, STANDOFF, STANDOFFS, boardLayout, type CaseLayout } from '../layout.ts';
import { M, box, copies, cyl, fan, glowMat, rbox, ring } from '../kit.ts';

export interface CaseModel {
  group: Group;
  rotors: Object3D[];
  glow: MeshStandardMaterial[];
}

const PLAIN: NonNullable<CasePart['look']> = {
  front: 'mesh',
  slats: 0,
  top: 'mesh',
  frontIo: 'top-front',
  ports: { usbA: 2, usbC: 1, audio: 1 },
  feet: 'pads',
  shroud: 'full',
};

export function buildCase(pcCase: CasePart, lay: CaseLayout): CaseModel {
  const group = new Group();
  const look = pcCase.look ?? PLAIN;
  const { L, W, H, rearX, frontX, floorY, shroudTopY, trayZ, rearInner, frontInner } = lay;
  const atx = boardLayout('ATX');
  const bodyH = H - floorY;
  const midY = floorY + bodyH / 2;

  // What it stands on
  if (look.feet === 'bars') {
    for (const sx of [-1, 1]) box(group, 34, floorY, W - 24, M.black, sx * (L / 2 - 46), floorY / 2, 0);
  } else {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        rbox(group, 46, floorY, 22, 4, M.black, sx * (L / 2 - 50), floorY / 2, sz * (W / 2 - 22));
      }
    }
  }

  // Shell: floor, roof, far side, rear, front
  box(group, L, PANEL, W, M.caseOuter, 0, floorY + PANEL / 2, 0);
  box(group, L, PANEL, W, M.caseOuter, 0, H - PANEL / 2, 0);
  box(group, L, bodyH, PANEL, M.caseOuter, 0, midY, -W / 2 + PANEL / 2);
  box(group, PANEL, bodyH, W, M.caseOuter, rearX + PANEL / 2, midY, 0);
  box(group, FRONT_DEPTH, bodyH, W, M.caseOuter, frontX - FRONT_DEPTH / 2, midY, 0);
  // Rim along the top of the open side, and the thumbscrews that hold the side panel
  box(group, L - FRONT_DEPTH, 10, PANEL, M.caseOuter, -FRONT_DEPTH / 2, H - PANEL - 5, W / 2 - PANEL / 2);
  for (const y of [floorY + bodyH * 0.25, floorY + bodyH * 0.75]) {
    cyl(group, 4.5, 6, M.steel, 'x', rearX - 3, y, W / 2 - 8, true);
  }

  // Top panel
  const topLen = L * 0.72;
  const topWide = W * 0.62;
  const topX = -L * 0.04;
  box(group, topLen, 0.8, topWide, M.vent, topX, H + 0.2, 0);
  if (look.top === 'mesh') {
    const cols = Math.floor(topLen / 21);
    const rows = Math.floor(topWide / 9);
    copies(group, cols * rows, M.caseInner, (dummy, i) => {
      const [col, line] = [i % cols, Math.floor(i / cols)];
      dummy.position.set(
        topX - topLen / 2 + 12 + col * 21 + (line % 2) * 10,
        H + 0.7,
        -topWide / 2 + 6 + line * 9,
      );
      dummy.scale.set(13, 0.5, 3.2);
    });
  } else if (look.top === 'slots') {
    const rows = Math.floor(topWide / 14);
    copies(group, rows, M.caseInner, (dummy, i) => {
      dummy.position.set(topX, H + 0.7, -topWide / 2 + 9 + i * 14);
      dummy.scale.set(topLen - 24, 0.5, 5);
    });
  }

  // Front panel
  const frontTall = bodyH - 46;
  const frontWide = W - 30;
  if (look.front === 'slats' && look.slats > 1) {
    box(group, 1, frontTall, frontWide, M.vent, frontX + 0.3, midY, 0);
    const pitch = frontWide / look.slats;
    copies(group, look.slats, M.caseOuter, (dummy, i) => {
      dummy.position.set(frontX + 4, midY, -frontWide / 2 + pitch * (i + 0.5));
      dummy.scale.set(7, frontTall, pitch * 0.62);
    });
  } else if (look.front === 'mesh') {
    box(group, 1, frontTall, frontWide, M.vent, frontX + 0.3, midY, 0);
    const cols = Math.floor(frontWide / 21);
    const rows = Math.floor(frontTall / 9);
    copies(group, cols * rows, M.caseInner, (dummy, i) => {
      const [col, line] = [i % cols, Math.floor(i / cols)];
      dummy.position.set(
        frontX + 0.9,
        midY - frontTall / 2 + 6 + line * 9,
        -frontWide / 2 + 12 + col * 21 + (line % 2) * 10 - 5,
      );
      dummy.scale.set(0.5, 3.2, 13);
    });
  } else if (look.front === 'glass') {
    box(group, 1, frontTall, frontWide, M.label, frontX + 0.3, midY, 0);
  } else {
    // A closed front draws air through a gap down each side.
    for (const sz of [-1, 1]) box(group, 1, frontTall, 5, M.vent, frontX + 0.3, midY, sz * (W / 2 - 9));
  }

  // Power button and front ports
  const led = glowMat(0x30333a, 0xe9f4ff);
  const ports = look.ports;
  const count = ports.usbA + ports.usbC + ports.audio;
  if (look.frontIo === 'front') {
    const y = H - 22;
    cyl(group, 6, 1.2, M.black, 'x', frontX + 0.6, y, W / 2 - 26);
    cyl(group, 2.4, 1.4, led, 'x', frontX + 0.9, y, W / 2 - 40, true);
    for (let i = 0; i < count; i++) {
      const wide = i < ports.usbA ? 13 : i < ports.usbA + ports.usbC ? 9 : 5;
      box(group, 1, 5, wide, M.slot, frontX + 0.6, y, W / 2 - 56 - i * 18);
    }
  } else {
    // On the roof: along the front edge, or along the edge above the open side
    const side = look.frontIo === 'top-side';
    const place = (along: number): [number, number, number] =>
      side ? [frontX - 40 - along, H + 0.6, W / 2 - 14] : [frontX - 16, H + 0.6, W / 2 - 22 - along];
    cyl(group, 7, 1.2, M.black, 'y', ...place(0));
    cyl(group, 2.6, 1.4, led, 'y', ...place(15), true);
    for (let i = 0; i < count; i++) {
      const wide = i < ports.usbA ? 13 : i < ports.usbA + ports.usbC ? 9 : 5;
      const [x, y, z] = place(32 + i * 18);
      if (side) box(group, wide, 1, 5.5, M.slot, x, y, z);
      else box(group, 5.5, 1, wide, M.slot, x, y, z);
    }
  }

  // Motherboard tray, with the cooler cut-out and cable pass-throughs marked on it
  const trayLen = frontInner - rearInner;
  const trayX = (frontInner + rearInner) / 2;
  box(group, trayLen, bodyH - PANEL * 2, 1.5, M.caseInner, trayX, midY, trayZ - 0.75);
  box(group, 130, 120, 0.5, M.vent, lay.board.x + atx.socket.u, lay.board.y - atx.socket.v, trayZ + 0.1);
  for (const grommet of lay.grommets) rbox(group, 14, 62, 1, 0.4, M.vent, grommet.x, grommet.y, trayZ + 0.3);
  const cutLen = lay.topCut.x1 - lay.topCut.x0;
  rbox(group, cutLen, 12, 1, 0.4, M.vent, lay.topCut.x0 + cutLen / 2, lay.topCut.y, trayZ + 0.3);

  // Standoffs
  for (const spot of STANDOFFS) {
    cyl(group, 3, STANDOFF, M.brass, 'z', lay.board.x + spot.u, lay.board.y - spot.v, trayZ + STANDOFF / 2, true);
  }

  // Rear panel, inner face: I/O opening, exhaust grille, expansion slot covers, PSU opening
  const innerFace = rearInner + 0.3;
  const boardZ = lay.board.z;
  box(group, 0.6, 159, 45, M.vent, innerFace, lay.board.y - 90, boardZ + 22);
  const grille = W / 2 - 14 - (boardZ + 52);
  const grilleZ = boardZ + 52 + grille / 2;
  box(group, 0.6, 122, grille, M.vent, innerFace, lay.board.y - 78, grilleZ);
  const fanRing = Math.min(58, grille / 2 - 2);
  for (const radius of [1, 0.7, 0.4]) {
    const loop = ring(group, fanRing * radius, fanRing * radius - 2, 0.8, M.caseInner, innerFace + 0.4, lay.board.y - 78, grilleZ);
    loop.rotation.y = Math.PI / 2;
  }
  const firstRow = atx.pcie.rows[0].v - 20.32;
  copies(group, pcCase.expansionSlots, M.heatsinkDark, (dummy, i) => {
    dummy.position.set(innerFace, lay.board.y - firstRow - i * 20.32 - 4, boardZ + 58);
    dummy.scale.set(0.8, 13, 108);
  });
  copies(group, pcCase.expansionSlots * 3, M.vent, (dummy, i) => {
    dummy.position.set(innerFace + 0.5, lay.board.y - firstRow - Math.floor(i / 3) * 20.32 - 4, boardZ + 30 + (i % 3) * 28);
    dummy.scale.set(0.4, 5, 20);
  });
  box(group, 0.6, 80, 140, M.vent, innerFace, floorY + PANEL + 44, trayZ + 8 + 75);

  // PSU shroud: a top plate that stops short of the front (room for a radiator),
  // a slot along the tray for cables, and a side face over the front half only
  // so the power supply stays visible
  const shroudDepth = W / 2 - trayZ;
  const shroudLen = trayLen - 70;
  box(group, shroudLen, 2, shroudDepth, M.caseInner, rearInner + shroudLen / 2, shroudTopY - 1, trayZ + shroudDepth / 2);
  const slotLen = lay.shroudCut.x1 - lay.shroudCut.x0;
  rbox(group, slotLen, 0.6, 14, 0.2, M.vent, lay.shroudCut.x0 + slotLen / 2, shroudTopY + 0.2, lay.shroudCut.z);
  const sideLen = trayLen * 0.5;
  const sideTall = shroudTopY - floorY - PANEL;
  if (look.shroud !== 'none') {
    box(group, sideLen, sideTall, 2, M.caseInner, frontInner - sideLen / 2, (shroudTopY + floorY + PANEL) / 2, W / 2 - 4);
  }
  if (look.shroud === 'vented') {
    const cols = Math.floor((sideLen - 30) / 21);
    const rows = Math.floor((sideTall - 20) / 9);
    copies(group, cols * rows, M.vent, (dummy, i) => {
      const [col, line] = [i % cols, Math.floor(i / cols)];
      dummy.position.set(
        frontInner - sideLen + 24 + col * 21 + (line % 2) * 10,
        floorY + PANEL + 14 + line * 9,
        W / 2 - 2.8,
      );
      dummy.scale.set(13, 3.2, 0.5);
    });
  }
  for (const bay of lay.bays) {
    rbox(group, 104, 1, 74, 0.3, M.heatsinkDark, bay.x, shroudTopY + 0.4, bay.z);
  }

  // Fans that ship with the case
  const rotors: Object3D[] = [];
  let fanY = shroudTopY + 12;
  for (const size of pcCase.includedFans.front) {
    const fitted = Math.min(size, W - 30);
    const intake = fan(group, fitted, 25, fitted >= 140 ? 9 : 7);
    intake.group.rotation.y = -Math.PI / 2;
    intake.group.position.set(frontInner - 13, fanY + fitted / 2, 0);
    rotors.push(intake.rotor);
    fanY += fitted + 4;
  }
  for (const size of pcCase.includedFans.rear) {
    const fitted = Math.min(size, grille - 2, 122);
    const exhaust = fan(group, fitted, 25);
    exhaust.group.rotation.y = Math.PI / 2;
    exhaust.group.position.set(rearInner + 13.5, lay.board.y - 78, grilleZ);
    rotors.push(exhaust.rotor);
  }
  pcCase.includedFans.top.forEach((size, i) => {
    const vent = fan(group, size, 25);
    vent.group.rotation.x = Math.PI / 2;
    vent.group.position.set(frontInner - 20 - size / 2 - i * (size + 4), H - PANEL - 13, W / 2 - 14 - size / 2);
    rotors.push(vent.rotor);
  });

  return { group, rotors, glow: [led] };
}
