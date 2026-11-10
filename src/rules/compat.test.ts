import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CASE, PARTS, partById } from '../catalog/parts.ts';
import type { Part } from '../catalog/types.ts';
import { BuildStore } from '../build/store.ts';
import { checkAdd, estimatedLoad, isBlocked, powerCheck, slotsFrom } from './compat.ts';

const get = (id: string): Part => {
  const part = partById(id);
  assert.ok(part, `missing part ${id}`);
  return part;
};

const board = get('msi-b650-tomahawk-wifi');
const ryzen = get('amd-ryzen-7-7800x3d');
const intel = get('intel-core-i5-14600k');
const cooler = get('noctua-nh-u12s');
const ddr5 = get('corsair-vengeance-ddr5-32-6000');
const ddr4 = get('corsair-vengeance-lpx-ddr4-16-3200');
const ssd = get('samsung-990-pro-1tb');
const rtx4070 = get('asus-dual-rtx-4070');
const rtx4090 = get('asus-rog-strix-rtx-4090');
const psu = get('corsair-rm750e');

const codes = (installed: Part[], part: Part): string[] =>
  checkAdd(slotsFrom(CASE, installed), part).map((issue) => issue.code);

test('every part id is unique and has a source', () => {
  assert.equal(new Set(PARTS.map((part) => part.id)).size, PARTS.length);
  for (const part of PARTS) assert.match(part.source, /^https:\/\//);
});

test('the board fits the case', () => {
  assert.deepEqual(codes([], board), []);
});

test('parts that mount on the board need the board first', () => {
  assert.deepEqual(codes([], ryzen), ['needs-motherboard']);
  assert.deepEqual(codes([], ddr5), ['needs-motherboard']);
  assert.deepEqual(codes([], rtx4070), ['needs-motherboard']);
  assert.deepEqual(codes([board], cooler), ['needs-cpu']);
});

test('the power supply can go in before anything else', () => {
  assert.deepEqual(codes([], psu), []);
});

test('an LGA1700 processor is refused by an AM5 board', () => {
  const issues = checkAdd(slotsFrom(CASE, [board]), intel);
  assert.deepEqual(issues.map((issue) => issue.code), ['cpu-socket']);
  assert.ok(isBlocked(issues));
  assert.match(issues[0].message, /LGA1700.*AM5/);
});

test('DDR4 is refused by a DDR5 board, DDR5 is accepted', () => {
  assert.deepEqual(codes([board], ddr4), ['ram-type']);
  assert.deepEqual(codes([board], ddr5), []);
});

test('a 357.6 mm card is too long for a 355 mm case', () => {
  const issues = checkAdd(slotsFrom(CASE, [board]), rtx4090);
  assert.ok(issues.some((issue) => issue.code === 'gpu-length' && issue.level === 'block'));
  assert.deepEqual(codes([board], rtx4070), []);
});

test('a 158 mm cooler clears 170 mm and supports AM5', () => {
  assert.deepEqual(codes([board, ryzen], cooler), []);
});

test('a second part in an occupied slot is refused', () => {
  assert.deepEqual(codes([board, ryzen], intel), ['occupied']);
});

test('load estimate and power supply checks', () => {
  const slots = slotsFrom(CASE, [board, ryzen, cooler, ddr5, ssd, rtx4070, psu]);
  assert.equal(estimatedLoad(slots), 60 + 162 + 200);
  assert.deepEqual(powerCheck(slots), { ready: true, reasons: [] });
});

test('the machine will not start with parts missing', () => {
  const check = powerCheck(slotsFrom(CASE, [board, ryzen]));
  assert.equal(check.ready, false);
  assert.ok(check.reasons.includes('No memory'));
  assert.ok(check.reasons.includes('No power supply'));
});

test('store: install, undo, redo and a new step dropping the redo tail', () => {
  const store = new BuildStore(CASE);
  assert.equal(store.install(board).ok, true);
  assert.equal(store.install(ryzen).ok, true);
  assert.equal(store.install(intel).ok, false);
  assert.equal(store.cursor, 2);

  store.undo();
  assert.equal(store.isInstalled(ryzen.id), false);
  store.redo();
  assert.equal(store.isInstalled(ryzen.id), true);

  store.undo();
  assert.equal(store.install(ddr5).ok, true);
  assert.deepEqual(store.steps.map((part) => part.id), [board.id, ddr5.id]);
});

test('store: a part with dependents cannot be removed', () => {
  const store = new BuildStore(CASE);
  store.install(board);
  store.install(ryzen);
  store.install(cooler);
  assert.equal(store.remove(ryzen.id).ok, false);
  assert.equal(store.remove(board.id).ok, false);
  assert.equal(store.remove(cooler.id).ok, true);
  assert.equal(store.remove(ryzen.id).ok, true);
  assert.deepEqual(store.installed.map((part) => part.id), [board.id]);
});
