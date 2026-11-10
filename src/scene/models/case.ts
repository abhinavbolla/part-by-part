// A generic mid-tower drawn from the case's outer dimensions. It is the
// right size for the catalog entry; it does not copy the product's styling.

import { Group, type MeshStandardMaterial, type Object3D } from 'three';

import type { CasePart } from '../../catalog/types.ts';
import { BOARD, FRONT_DEPTH, PANEL, STANDOFF, type CaseLayout } from '../layout.ts';
import { M, box, cyl, fan, glowMat, rbox } from '../kit.ts';

export interface CaseModel {
  group: Group;
  rotors: Object3D[];
  glow: MeshStandardMaterial[];
}

export function buildCase(pcCase: CasePart, lay: CaseLayout): CaseModel {
  const group = new Group();
  const { L, W, H, rearX, frontX, floorY, shroudTopY, trayZ, rearInner, frontInner } = lay;
  const bodyH = H - floorY;
  const midY = floorY + bodyH / 2;

  // Feet
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      rbox(group, 46, floorY, 22, 4, M.black, sx * (L / 2 - 50), floorY / 2, sz * (W / 2 - 22));
    }
  }

  // Shell: floor, roof, far side, rear, front
  box(group, L, PANEL, W, M.caseOuter, 0, floorY + PANEL / 2, 0);
  box(group, L, PANEL, W, M.caseOuter, 0, H - PANEL / 2, 0);
  box(group, L * 0.72, 0.8, W * 0.62, M.vent, -L * 0.04, H + 0.2, 0);
  box(group, L, bodyH, PANEL, M.caseOuter, 0, midY, -W / 2 + PANEL / 2);
  box(group, PANEL, bodyH, W, M.caseOuter, rearX + PANEL / 2, midY, 0);
  rbox(group, FRONT_DEPTH, bodyH, W, 3, M.caseOuter, frontX - FRONT_DEPTH / 2, midY, 0);
  box(group, 1, bodyH - 60, W - 36, M.vent, frontX + 0.2, midY, 0);

  // Rim along the top of the open side
  box(group, L - FRONT_DEPTH, 10, PANEL, M.caseOuter, -FRONT_DEPTH / 2, H - PANEL - 5, W / 2 - PANEL / 2);

  // Motherboard tray, with the cooler cut-out and cable grommets marked on it
  const trayLen = frontInner - rearInner;
  const trayX = (frontInner + rearInner) / 2;
  box(group, trayLen, bodyH - PANEL * 2, 1.5, M.caseInner, trayX, midY, trayZ - 0.75);
  box(group, 130, 120, 0.5, M.vent,
    lay.board.x + BOARD.socket.u, lay.board.y - BOARD.socket.v, trayZ + 0.1);
  for (const dy of [-70, -160, -250]) {
    rbox(group, 14, 62, 1, 0.4, M.vent, lay.board.x + BOARD.w + 22, lay.board.y + dy, trayZ + 0.3);
  }

  // Standoffs
  for (const [u, v] of BOARD.holes) {
    cyl(group, 3, STANDOFF, M.brass, 'z',
      lay.board.x + u, lay.board.y - v, trayZ + STANDOFF / 2, true);
  }

  // Rear panel, inner face: I/O opening, exhaust grille, expansion slot covers
  const innerFace = rearInner + 0.3;
  const boardZ = lay.board.z;
  box(group, 0.6, 159, 45, M.vent, innerFace, lay.board.y - 90, boardZ + 22);
  const grille = W / 2 - 14 - (boardZ + 52);
  box(group, 0.6, 122, grille, M.vent, innerFace, lay.board.y - 78, boardZ + 52 + grille / 2);
  for (let i = 0; i < pcCase.expansionSlots; i++) {
    const y = lay.board.y - (BOARD.pcie.v[0] - 20.32) - i * 20.32;
    box(group, 0.8, 13, 108, M.heatsinkDark, innerFace, y - 4, boardZ + 58);
  }

  // PSU shroud: a top plate, and a side face over the front half only so the
  // power supply stays visible
  const shroudDepth = W / 2 - trayZ;
  box(group, trayLen, 2, shroudDepth, M.caseInner, trayX, shroudTopY - 1, trayZ + shroudDepth / 2);
  const sideLen = trayLen * 0.5;
  box(group, sideLen, shroudTopY - floorY - PANEL, 2, M.caseInner,
    frontInner - sideLen / 2, (shroudTopY + floorY + PANEL) / 2, W / 2 - 4);

  // Front intake fans, as shipped with the case
  const rotors: Object3D[] = [];
  const fanSize = 140;
  const firstY = shroudTopY + 12 + fanSize / 2;
  for (let i = 0; i < 2; i++) {
    const intake = fan(group, fanSize, 25);
    intake.group.rotation.y = -Math.PI / 2;
    intake.group.position.set(frontInner - 13, firstY + i * (fanSize + 4), 0);
    rotors.push(intake.rotor);
  }

  // Power light on the roof, near the front
  const led = glowMat(0x30333a, 0xe9f4ff);
  cyl(group, 3.2, 1.2, led, 'y', frontX - 44, H + 0.6, W / 2 - 30, true);
  cyl(group, 7, 1, M.black, 'y', frontX - 64, H + 0.5, W / 2 - 30);

  return { group, rotors, glow: [led] };
}
