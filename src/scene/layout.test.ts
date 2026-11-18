// Where a case puts the power supply and the drives. A case with the supply on
// its side behind the tray must leave room for the longest one it accepts, in
// the space behind the ledge, and the cables must find its sockets there.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CASES } from '../catalog/parts.ts';
import type { PsuPart } from '../catalog/types.ts';
import { PANEL, STANDOFF, boardLayout, caseLayout, ledgeTop, psuBody } from './layout.ts';
import { psuSocket } from './models/components.ts';

/** The longest power supply a case accepts, as a catalog entry. */
const longest = (length: number): PsuPart => ({
  id: 'test-psu', category: 'psu', brand: 'Test', name: 'Test', sku: 'TEST', source: 'https://example.com/',
  wattage: 1000, formFactor: 'ATX', length, modular: 'full',
  connectors: { atx24: 1, eps8: 2, pcie8: 4, hpwr16: 1, sata: 6 },
});

const sideCases = CASES.filter((pcCase) => pcCase.look?.sidePsu);

test('there is a case with its power supply on its side', () => {
  assert.ok(sideCases.length > 0);
});

test('a power supply on its side fits between the far panel and the ledge', () => {
  for (const pcCase of sideCases) {
    const lay = caseLayout(pcCase);
    const where = pcCase.id;
    assert.ok(lay.psu.side, `${where}: the layout knows the supply is on its side`);
    const ledge = lay.ledge;
    assert.ok(ledge, `${where}: a ledge`);
    const { width, height } = psuBody('ATX');
    const box = {
      x: [lay.psu.x, lay.psu.x + pcCase.maxPsuLength],
      y: [lay.psu.y, lay.psu.y + width],
      z: [lay.psu.z - height, lay.psu.z],
    };
    // Across the case: from the far panel's inner face to short of the ledge's face
    assert.ok(box.z[0] >= -lay.W / 2 + PANEL, `${where}: clear of the far panel`);
    assert.ok(box.z[1] <= ledge.z - 2, `${where}: behind the ledge's face`);
    assert.ok(box.z[0] < lay.trayZ && box.z[1] > lay.trayZ, `${where}: reaches out under the ledge`);
    // Under the ledge's top along its whole length, and above the far half's floor
    for (let x = box.x[0]; x <= box.x[1]; x += 5) {
      assert.ok(box.y[1] < ledgeTop(ledge, x) - 2, `${where}: under the ledge at x ${x}`);
    }
    assert.ok(box.y[0] >= PANEL, `${where}: on the floor of the far half`);
    // Clear of the rear plate, the board and the runners under the raised half
    assert.ok(box.x[0] > lay.rearInner, `${where}: in front of the rear plate`);
    assert.ok(box.x[1] < lay.frontInner, `${where}: behind the front`);
    const board = boardLayout('ATX');
    assert.ok(box.y[1] < lay.board.y - board.h, `${where}: under the board`);
    assert.ok(box.z[1] < ledge.z && box.y[0] < lay.floorY, `${where}: beside the runners, which stand under the raised half only`);
    // The rear opening is over its inlet face, and inside the plate
    const hole = lay.psuHole;
    assert.ok(hole.z0 >= box.z[0] && hole.z1 <= box.z[1], `${where}: the rear opening is over the supply across the case`);
    assert.ok(hole.y0 >= box.y[0] && hole.y1 <= box.y[1], `${where}: the rear opening is over the supply's height`);
    assert.ok(hole.z1 - hole.z0 > 60 && hole.y1 - hole.y0 > 120, `${where}: the opening is tall, as the supply stands`);
    assert.ok(hole.z0 > -lay.W / 2 && hole.y0 > 0, `${where}: the opening leaves a rim`);
    // The cable slot on the ledge is clear of the longest supply's cable face, on the level part
    assert.ok(lay.shroudCut.x0 > box.x[1] + 10, `${where}: the slot is in front of the supply`);
    assert.ok(lay.shroudCut.x1 <= ledge.slopeX0, `${where}: the slot is on the level top`);
    assert.ok(lay.shroudCut.z > lay.trayZ && lay.shroudCut.z + 7 < ledge.z, `${where}: the slot is on the ledge's top`);
    assert.equal(lay.shroudTopY, ledge.rearY, `${where}: the board stands on the ledge`);
  }
});

test('the sockets of a power supply on its side are on its cable face', () => {
  for (const pcCase of sideCases) {
    const lay = caseLayout(pcCase);
    for (const length of [140, pcCase.maxPsuLength]) {
      const psu = longest(length);
      const { width, height } = psuBody('ATX');
      for (let index = 0; index < 10; index++) {
        const [x, y, z] = psuSocket(psu, lay, index);
        assert.equal(x, lay.psu.x + length, `${pcCase.id}: socket ${index} on the face`);
        assert.ok(y > lay.psu.y && y < lay.psu.y + width, `${pcCase.id}: socket ${index} within the face's height`);
        assert.ok(z > lay.psu.z - height && z < lay.psu.z, `${pcCase.id}: socket ${index} within the face's width`);
      }
    }
  }
});

test('drive mounts in a case with the supply on its side are behind the tray', () => {
  for (const pcCase of sideCases) {
    const lay = caseLayout(pcCase);
    assert.ok(lay.bays.length > 0, `${pcCase.id}: drive mounts`);
    for (const bay of lay.bays) {
      assert.equal(bay.face, 'back', `${pcCase.id}: the drive faces the far panel`);
      // A drive is 7 mm thick and 69.85 mm across, lying flat against the tray
      assert.ok(bay.z < lay.trayZ - 1.5 && bay.z - 7 > -lay.W / 2 + PANEL, `${pcCase.id}: between the tray and the far panel`);
      assert.ok(bay.y - 36 > lay.ledge!.rearY, `${pcCase.id}: above the ledge`);
      assert.ok(bay.x - 50 > lay.rearInner && bay.y + 36 < lay.H - PANEL, `${pcCase.id}: on the tray`);
    }
    // Two drives do not overlap
    const [a, b] = lay.bays;
    if (b) assert.ok(Math.abs(a.y - b.y) > 69.85 + 10, `${pcCase.id}: drives apart`);
  }
});

test('a case with a shroud keeps its supply under it and its drives on top', () => {
  for (const pcCase of CASES.filter((item) => !item.look?.sidePsu)) {
    const lay = caseLayout(pcCase);
    assert.equal(lay.ledge, null);
    assert.equal(lay.psu.side, false);
    assert.equal(lay.trayZ, -lay.W / 2 + 26);
    assert.equal(lay.board.z, lay.trayZ + STANDOFF + 1.6);
    for (const bay of lay.bays) assert.equal(bay.face, 'up');
    assert.ok(lay.psu.y + psuBody('ATX').height < lay.shroudTopY, `${pcCase.id}: the supply is under the shroud`);
  }
});
