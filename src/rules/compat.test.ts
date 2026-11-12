import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CASES, CATALOG, DEFAULT_CASE, PARTS, itemById } from '../catalog/parts.ts';
import type { CablePart, CasePart, Part, Step } from '../catalog/types.ts';
import { BuildStore } from '../build/store.ts';
import {
  cablesFor,
  checkAdd,
  estimatedLoad,
  gpuClearance,
  isBlocked,
  powerCheck,
  radiatorMount,
  slotsFrom,
  storageMounts,
} from './compat.ts';

const get = (id: string): Part => {
  const part = itemById(id);
  assert.ok(part && part.category !== 'case', `missing part ${id}`);
  return part;
};
const getCase = (id: string): CasePart => {
  const item = itemById(id);
  assert.ok(item && item.category === 'case', `missing case ${id}`);
  return item;
};

const north = DEFAULT_CASE;
const board = get('msi-b650-tomahawk-wifi');
const z790 = get('msi-mag-z790-tomahawk-wifi');
const ddr4Board = get('msi-pro-z790-p-wifi-ddr4');
const itx = get('asus-rog-strix-b650e-i-gaming-wifi');
const ryzen = get('amd-ryzen-7-7800x3d');
const intel = get('intel-core-i5-14600k');
const noGraphics = get('intel-core-i5-14400f');
const cooler = get('noctua-nh-u12s');
const tallCooler = get('be-quiet-dark-rock-pro-5');
const aio360 = get('arctic-liquid-freezer-iii-360');
const aio240 = get('corsair-nautilus-240-rs');
const ddr5 = get('corsair-vengeance-ddr5-32-6000');
const ddr4 = get('corsair-vengeance-lpx-ddr4-16-3200');
const ssd = get('samsung-990-pro-1tb');
const ssd2 = get('kingston-kc3000-1tb');
const sataM2 = get('wd-blue-sa510-m2-1tb');
const sata25 = get('samsung-870-evo-1tb');
const rtx4070 = get('asus-dual-rtx-4070');
const rtx4090 = get('asus-rog-strix-rtx-4090');
const rx7900 = get('sapphire-nitro-plus-rx-7900-xtx-vapor-x-24gb');
const tuf4080 = get('asus-tuf-gaming-rtx-4080-super-16gb');
const psu = get('corsair-rm750e');
const weakPsu = get('msi-mag-a550bn');
const sfx = get('corsair-sf750-2024');

const codes = (installed: Step[], step: Step, pcCase: CasePart = north): string[] =>
  checkAdd(slotsFrom(pcCase, installed), step).map((issue) => issue.code);

test('catalog: ids and part numbers are unique, every item has a source, and there are over a hundred', () => {
  assert.equal(new Set(CATALOG.map((item) => item.id)).size, CATALOG.length);
  assert.equal(new Set(CATALOG.map((item) => `${item.category} ${item.sku}`)).size, CATALOG.length);
  for (const item of CATALOG) assert.match(item.source, /^https:\/\//, item.id);
  assert.ok(CATALOG.length >= 110, `only ${CATALOG.length} items`);
  assert.equal(CASES.length, 11);
});

test('every board fits at least one case, and every ATX board fits every case', () => {
  for (const part of PARTS) {
    if (part.category !== 'motherboard') continue;
    assert.ok(CASES.some((pcCase) => codes([], part, pcCase).length === 0), part.id);
  }
});

test('parts that mount on the board need the board first', () => {
  assert.deepEqual(codes([], ryzen), ['needs-motherboard']);
  assert.deepEqual(codes([], ddr5), ['needs-motherboard']);
  assert.deepEqual(codes([], rtx4070), ['needs-motherboard']);
  assert.deepEqual(codes([], ssd), ['needs-motherboard']);
  assert.deepEqual(codes([board], cooler), ['needs-cpu']);
});

test('the power supply and a 2.5-inch drive can go in before the board', () => {
  assert.deepEqual(codes([], psu), []);
  assert.deepEqual(codes([], sata25), []);
});

test('sockets: LGA1700 is refused by AM5 and accepted by Z790', () => {
  const issues = checkAdd(slotsFrom(north, [board]), intel);
  assert.deepEqual(issues.map((issue) => issue.code), ['cpu-socket']);
  assert.match(issues[0].message, /LGA1700.*AM5/);
  assert.deepEqual(codes([z790], intel), []);
  assert.deepEqual(codes([z790], get('intel-core-ultra-7-265k')), ['cpu-socket']);
});

test('memory type follows the board', () => {
  assert.deepEqual(codes([board], ddr4), ['ram-type']);
  assert.deepEqual(codes([board], ddr5), []);
  assert.deepEqual(codes([ddr4Board], ddr4), []);
  assert.deepEqual(codes([ddr4Board], ddr5), ['ram-type']);
});

test('graphics card length against each case', () => {
  assert.ok(codes([board], rtx4090).includes('gpu-length'));
  assert.deepEqual(codes([board], rtx4070), []);
  assert.deepEqual(codes([board], rtx4090, getCase('nzxt-h5-flow-2024')), []);
});

test('a front radiator takes room from the graphics card', () => {
  assert.equal(radiatorMount(north, aio360 as never), 'front');
  assert.equal(radiatorMount(north, aio240 as never), 'top');
  const slots = slotsFrom(north, [board, ryzen, aio360]);
  assert.equal(gpuClearance(slots), 355 - 38 - 25);
  assert.ok(codes([board, ryzen, aio360], tuf4080).includes('gpu-length'));
  assert.deepEqual(codes([board, ryzen, aio240], rx7900), []);
});

test('cooler height and socket support', () => {
  assert.deepEqual(codes([board, ryzen], cooler), []);
  assert.deepEqual(codes([board, ryzen], tallCooler), []);
  const lowCase: CasePart = { ...north, maxCoolerHeight: 160 };
  assert.deepEqual(codes([board, ryzen], tallCooler, lowCase), ['cooler-height']);
  const z890 = get('msi-mag-z890-tomahawk-wifi');
  assert.deepEqual(codes([z890, get('intel-core-ultra-7-265k')], get('deepcool-ak620')), ['cooler-socket']);
});

test('drives: slots fill in order, SATA M.2 needs a slot that takes it', () => {
  assert.deepEqual(codes([board], sataM2), ['m2-slot']);
  assert.deepEqual(codes([z790], sataM2), []);
  const slots = slotsFrom(north, [z790, ssd, sataM2, ssd2]);
  const mounts = storageMounts(slots);
  assert.deepEqual(mounts.get(ssd.id), { kind: 'm2', index: 0 });
  assert.deepEqual(mounts.get(sataM2.id), { kind: 'm2', index: 2 });
  assert.deepEqual(mounts.get(ssd2.id), { kind: 'm2', index: 1 });
  assert.deepEqual(codes([itx, ssd, ssd2], get('wd-black-sn850x-2tb')), ['m2-full']);
});

test('a drive keeps its slot when an earlier one is removed', () => {
  const store = new BuildStore(north);
  for (const part of [board, ssd, ssd2]) assert.equal(store.install(part).ok, true);
  assert.deepEqual(store.mounts.get(ssd2.id), { kind: 'm2', index: 1 });
  assert.equal(store.remove(ssd.id).ok, true);
  assert.deepEqual(storageMounts(store.slots).get(ssd2.id), { kind: 'm2', index: 1 });
});

test('power supply: form factor, wattage, and connectors', () => {
  assert.deepEqual(codes([], sfx), ['psu-form-factor']);
  const hungry = slotsFrom(north, [board, get('amd-ryzen-9-9950x'), rx7900, weakPsu]);
  assert.equal(estimatedLoad(hungry), 60 + 230 + 420);
  assert.ok(powerCheck(hungry).faults.some((fault) => /Estimated load is 710 W/.test(fault)));
  const short = checkAdd(slotsFrom(north, [board, rx7900]), weakPsu).map((issue) => issue.code);
  assert.ok(short.includes('psu-gpu-8pin'));
});

test('a processor without graphics needs a card', () => {
  const slots = slotsFrom(north, [z790, noGraphics]);
  assert.ok(powerCheck(slots).faults.some((fault) => /no integrated graphics/.test(fault)));
});

const cable = (slots: ReturnType<typeof slotsFrom>, id: string): CablePart => {
  const found = cablesFor(slots).find((item) => item.id === id);
  assert.ok(found, `no cable ${id}`);
  return found;
};

test('cables follow from the parts, and the machine needs them to start', () => {
  const store = new BuildStore(north);
  for (const part of [board, ryzen, cooler, ddr5, ssd, rtx4070, psu]) assert.equal(store.install(part).ok, true);
  const wanted = store.wiring().map((item) => item.cable.id);
  assert.deepEqual(wanted, ['cable-atx24', 'cable-eps', 'cable-gpu', 'cable-cooler', 'cable-front']);
  assert.equal(estimatedLoad(store.slots), 60 + 162 + 200);

  let check = powerCheck(store.slots);
  assert.equal(check.ready, false);
  assert.deepEqual(check.missing, []);
  assert.equal(check.unplugged.length, 5);

  for (const id of wanted) assert.equal(store.install(cable(store.slots, id)).ok, true);
  check = powerCheck(store.slots);
  assert.deepEqual(check, { ready: true, missing: [], unplugged: [], faults: [] });
});

test('a SATA drive adds a cable; a card the supply cannot feed has its cable refused', () => {
  const withDrive = slotsFrom(north, [board, psu, sata25]);
  assert.ok(cablesFor(withDrive).some((item) => item.kind === 'sata'));
  const starved = slotsFrom(north, [board, rx7900, weakPsu]);
  const issues = checkAdd(starved, cable(starved, 'cable-gpu'));
  assert.ok(isBlocked(issues));
});

test('store: install, undo, redo and a new step dropping the redo tail', () => {
  const store = new BuildStore(north);
  assert.equal(store.install(board).ok, true);
  assert.equal(store.install(ryzen).ok, true);
  assert.equal(store.install(get('amd-ryzen-5-7600')).ok, false);
  assert.equal(store.cursor, 2);

  store.undo();
  assert.equal(store.isInstalled(ryzen.id), false);
  store.redo();
  assert.equal(store.isInstalled(ryzen.id), true);

  store.undo();
  assert.equal(store.install(ddr5).ok, true);
  assert.deepEqual(store.steps.map((step) => step.id), [board.id, ddr5.id]);
});

test('store: dependents block removal, and removing a part unplugs its cables', () => {
  const store = new BuildStore(north);
  for (const part of [board, ryzen, cooler, rtx4070, psu]) store.install(part);
  for (const id of ['cable-atx24', 'cable-gpu', 'cable-cooler']) store.install(cable(store.slots, id));
  assert.equal(store.remove(ryzen.id).ok, false);
  assert.equal(store.remove(board.id).ok, false);

  assert.equal(store.remove(rtx4070.id).ok, true);
  assert.equal(store.isInstalled('cable-gpu'), false);
  assert.equal(store.isInstalled('cable-atx24'), true);

  assert.equal(store.remove(psu.id).ok, true);
  assert.equal(store.isInstalled('cable-atx24'), false);
  assert.equal(store.isInstalled('cable-cooler'), true);
});

test('store: the case can change only while it is empty, and a build survives save and restore', () => {
  const store = new BuildStore(north);
  const lancool = getCase('lian-li-lancool-216');
  store.install(board);
  assert.equal(store.setCase(lancool).ok, false);
  store.undo();
  assert.equal(store.setCase(lancool).ok, true);
  for (const part of [board, ryzen, ssd, ssd2]) store.install(part);

  const copy = new BuildStore(north);
  assert.equal(copy.restore(JSON.parse(JSON.stringify(store.save()))), true);
  assert.equal(copy.pcCase.id, lancool.id);
  assert.deepEqual(copy.installed.map((step) => step.id), store.installed.map((step) => step.id));
  assert.deepEqual(copy.mounts.get(ssd2.id), { kind: 'm2', index: 1 });
  assert.equal(copy.restore({ v: 1 }), false);
});
