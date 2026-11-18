// The drawing details in the catalog are entered by hand. These checks catch
// an entry that cannot be drawn: a heatsink off the board, a cover over a
// socket that is not there, a fan larger than its card, a power supply that
// does not fit where the case's drawing puts it.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { FRONT_DEPTH, GPU_ROW, PANEL, SLOT_PITCH, boardLayout, psuBody } from '../scene/layout.ts';
import { CASES, PARTS } from './parts.ts';

test('every board with a recorded arrangement can be drawn', () => {
  for (const board of PARTS) {
    if (board.category !== 'motherboard' || !board.look) continue;
    const bl = boardLayout(board);
    const { sinks, slots, m2, sataEdge, socket, eps } = board.look;
    assert.ok(socket[0] > 60 && socket[0] < bl.w - 60 && socket[1] > 50 && socket[1] < bl.h / 2 + 20, `${board.id}: socket`);
    assert.ok(eps.length >= board.epsConnectors, `${board.id}: a position for each CPU power socket`);
    assert.equal(m2.length, board.m2Slots.length, `${board.id}: one position per M.2 socket`);
    for (const [u, v, dir] of m2) {
      assert.ok(dir === 1 || dir === -1);
      assert.ok(u > 0 && u < bl.w && v > 0 && v < bl.h, `${board.id}: M.2 socket at ${u}, ${v} is on the board`);
    }
    for (const sink of sinks) {
      const [u0, v0, u1, v1] = sink.at;
      assert.ok(u1 > u0 && v1 > v0, `${board.id}: ${sink.kind} has a size`);
      assert.ok(u0 >= -9 && v0 >= 0 && u1 <= bl.w + 2 && v1 <= bl.h, `${board.id}: ${sink.kind} at ${sink.at} is on the board`);
      assert.ok(sink.tall > 0 && sink.tall <= 50, `${board.id}: ${sink.kind} is a sensible height`);
      for (const socket of sink.covers ?? []) {
        assert.ok(socket >= 0 && socket < m2.length, `${board.id}: a cover names socket ${socket}`);
        const [u, v] = m2[socket];
        assert.ok(u >= u0 - 4 && u <= u1 && v >= v0 && v <= v1, `${board.id}: the cover over socket ${socket} is over it`);
      }
    }
    const first = bl.pcie.rows[0].v;
    assert.ok(Math.abs((first - GPU_ROW) / SLOT_PITCH - Math.round((first - GPU_ROW) / SLOT_PITCH)) < 1e-9);
    const seen = new Set<number>([0]);
    for (const slot of slots) {
      assert.ok(Number.isInteger(slot.row) && slot.row > 0, `${board.id}: slot rows count down from the graphics slot`);
      assert.ok(!seen.has(slot.row), `${board.id}: one slot per row`);
      seen.add(slot.row);
      assert.ok(first + slot.row * SLOT_PITCH < bl.h - 4, `${board.id}: slot row ${slot.row} is on the board`);
    }
    assert.equal(bl.pcie.rows.length, slots.length + 1);
    assert.ok(sataEdge >= 0 && sataEdge <= board.sataPorts, `${board.id}: sideways SATA ports`);
  }
});

test('a board without one falls back to the usual arrangement for its size', () => {
  const plain = boardLayout('ATX');
  assert.equal(plain.pcie.rows[0].v, GPU_ROW);
  assert.equal(boardLayout('ATX'), plain);
});

test('every card with recorded details can be drawn', () => {
  for (const card of PARTS) {
    if (card.category !== 'gpu' || !card.look) continue;
    const look = card.look;
    assert.equal(look.fanSizes.length, card.fans, `${card.id}: one size per fan`);
    for (const size of look.fanSizes) assert.ok(size >= 60 && size <= card.height, `${card.id}: fan of ${size} mm fits`);
    assert.ok(look.fanSizes.reduce((sum, size) => sum + size, 0) <= card.length + 12, `${card.id}: fans fit along the card`);
    assert.ok(look.blades >= 5 && look.blades <= 15, `${card.id}: blades`);
    assert.ok(look.pcb >= 120 && look.pcb <= card.length, `${card.id}: board no longer than the card`);
    const { from, to, span, chip } = look.backplate;
    assert.ok(from >= 0 && to <= 1 && from <= to && span >= 0 && span <= 1, `${card.id}: backplate opening`);
    if (look.backplate.open !== 'closed') assert.ok(to - from > 0.05 && span > 0.3, `${card.id}: an opening has a size`);
    if (chip) assert.ok(chip.at > 0.1 && chip.at < from + 1 && chip.size < card.height - 20, `${card.id}: chip window`);
    if (chip && look.backplate.open !== 'closed') {
      assert.ok(card.length * (from - chip.at) > chip.size / 2, `${card.id}: chip window clear of the tail opening`);
    }
    assert.ok(look.power.at > 30 && look.power.at < card.length - 5, `${card.id}: power sockets on the card`);
    assert.ok(look.shroud.wrap > 0 && look.shroud.wrap <= 1 && look.shroud.cut >= 0, `${card.id}: shroud`);
    for (const [a, b] of [...look.edge.fins, ...(look.edge.plate ? [look.edge.plate] : []), ...(look.lights.edge ? [look.lights.edge] : [])]) {
      assert.ok(a >= 0 && b <= 1 && a < b, `${card.id}: stretch ${a}..${b} along the edge`);
    }
  }
});

test('every cooler with recorded details can be drawn', () => {
  for (const cooler of PARTS) {
    if (cooler.category !== 'cooler' || !cooler.look) continue;
    if (cooler.kind === 'air') {
      const look = cooler.look;
      assert.ok(look.pipes >= 1 && look.pipes <= 10, `${cooler.id}: pipes`);
      assert.equal(look.stack.length, cooler.towers, `${cooler.id}: one depth per tower`);
      // One tower: the stack and every fan. Two: both stacks, the 30 mm gap the
      // middle fan hangs in, and the front fan when there is one.
      const fanDeep = (i: number): number => look.fanDepths?.[i] ?? 25;
      const depth = look.stack.reduce((sum, stack) => sum + stack, 0) + (cooler.towers === 2
        ? 30 + (cooler.fans > 1 ? fanDeep(0) : 0)
        : Array.from({ length: cooler.fans }, (_, i) => fanDeep(i)).reduce((sum, deep) => sum + deep, 0));
      assert.ok(Math.abs(depth - cooler.depth) <= 6, `${cooler.id}: stacks and fans add up to its depth (${depth} against ${cooler.depth})`);
      assert.ok(look.cutaway[0] >= 0 && look.cutaway[0] < cooler.height / 2 && look.cutaway[1] < Math.min(...look.stack), `${cooler.id}: cutaway`);
      if (look.top === 'hood') assert.equal(cooler.towers, 2, `${cooler.id}: a hood spans two towers`);
      if (look.fanSizes) assert.equal(look.fanSizes.length, cooler.fans, `${cooler.id}: one size per fan`);
      if (look.fanBlades) assert.equal(look.fanBlades.length, cooler.fans, `${cooler.id}: one blade count per fan`);
      for (const size of look.fanSizes ?? []) assert.ok(size >= 80 && size <= 150, `${cooler.id}: fan size`);
    } else {
      const across = cooler.look.blockSize;
      assert.ok(across >= 40 && across <= 110, `${cooler.id}: block size`);
      assert.ok(cooler.look.hose >= 8 && cooler.look.hose <= 16, `${cooler.id}: hose`);
    }
  }
});

test('every case with recorded details can be drawn', () => {
  for (const pcCase of CASES) {
    const look = pcCase.look;
    if (!look) continue;
    const { length: L, width: W, height: H } = pcCase.dims;
    const feet = look.feetHeight ?? 22;
    assert.ok(feet >= 5 && feet <= 60, `${pcCase.id}: feet`);
    assert.ok(look.frontDepth >= FRONT_DEPTH - 5 && look.frontDepth < L / 3, `${pcCase.id}: closed front section`);
    assert.ok(look.topSolidFront >= 0 && look.topSolidFront < L / 2, `${pcCase.id}: solid strip at the front of the roof`);
    if (look.topSolidFar !== undefined) {
      assert.ok(look.topSolidFar > 30 && look.topSolidFar < W / 2, `${pcCase.id}: solid strip along the roof's far edge`);
      assert.equal(look.ioAt, 'far', `${pcCase.id}: the ports sit on the far strip`);
    }
    if (look.frontFoot !== undefined) {
      assert.ok(look.frontFoot > 0 && look.frontFoot < H / 4, `${pcCase.id}: solid foot of the front`);
      assert.equal(look.front, 'mesh', `${pcCase.id}: a front that reaches the floor is a perforated panel`);
    }
    const ports = 1 + look.ports.usbA + look.ports.usbC + look.ports.audio + (look.reset ? 1 : 0);
    assert.ok(ports * 19 < (look.ioAt === 'far' ? L : W) - 40, `${pcCase.id}: the button and ports fit in a row`);
    // A case without a shroud has its power supply on its side behind the tray, and only such a case
    assert.equal(look.shroud === 'none', look.sidePsu !== undefined, `${pcCase.id}: sidePsu goes with shroud 'none'`);
    const side = look.sidePsu;
    if (side) {
      const { width, height } = psuBody('ATX');
      assert.deepEqual(pcCase.psuFormFactors, ['ATX'], `${pcCase.id}: the ledge is sized for an ATX body`);
      assert.ok(side.behindTray > 15 && side.behindTray < W / 4, `${pcCase.id}: cable space behind the tray`);
      // Deep enough for the body across the case, tall enough for its width standing up, under the ledge's top
      assert.ok(side.behindTray + side.ledge.out >= height + 4, `${pcCase.id}: ledge stands out far enough for an ATX body`);
      assert.ok(side.ledge.rear - PANEL - 2 >= width + 12, `${pcCase.id}: ledge is high enough over an ATX body on its side`);
      assert.ok(side.ledge.front < side.ledge.rear && side.ledge.front > feet + PANEL + 20, `${pcCase.id}: ledge falls toward the front`);
      assert.ok(side.ledge.out < W / 2, `${pcCase.id}: ledge stands short of the glass`);
      assert.ok(side.vent > 40 && side.vent < L / 2, `${pcCase.id}: vent band on the far panel`);
      // The level part of the ledge covers the longest supply and the bend of its cables
      assert.ok(L * 0.6 - PANEL > pcCase.maxPsuLength + 40, `${pcCase.id}: the level part covers the supply`);
    }
  }
});
