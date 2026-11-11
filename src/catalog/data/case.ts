import type { CasePart } from '../types.ts';

// `look` records what each case looks like on its maker's page (read 2026-11-11):
// the kind of front and top panel, where the ports are, what it stands on.
export const CASES: CasePart[] = [
  {
    id: 'fractal-north-tg', category: 'case', brand: 'Fractal Design', name: 'North', sku: 'FD-C-NOR1C-02',
    source: 'https://www.fractal-design.com/products/cases/north-series/north/north-charcoal-black-tg-light/',
    dims: { length: 447, width: 215, height: 469 },
    moboFormFactors: ['ATX', 'mATX', 'Mini-ITX'],
    maxGpuLength: 355,
    // The product page prints 145 mm; Fractal's support article gives 170 mm, or
    // 145 mm with the mesh panel's fan bracket fitted. The glass panel has no
    // bracket, so 170 mm is used here.
    // https://support.fractal-design.com/support/solutions/articles/4000189455-north
    maxCoolerHeight: 170,
    psuFormFactors: ['ATX'], maxPsuLength: 255, expansionSlots: 7,
    includedFans: { front: [140, 140], top: [], rear: [] },
    radiators: { front: [120, 140, 240, 280, 360], top: [120, 240], rear: [120] },
    bays: { ssd25: 2, hdd35: 2 },
    look: { front: 'slats', slats: 10, top: 'mesh', frontIo: 'top-front', ports: { usbA: 2, usbC: 1, audio: 2 }, feet: 'pads', shroud: 'full' },
  },
  {
    id: 'corsair-4000d-airflow', category: 'case', brand: 'Corsair', name: '4000D Airflow', sku: 'CC-9011200-WW',
    source: 'https://www.corsair.com/us/en/p/pc-cases/cc-9011200-ww/4000d-airflow-tempered-glass-mid-tower-atx-case-black-cc-9011200-ww',
    dims: { length: 453, width: 230, height: 466 },
    moboFormFactors: ['E-ATX', 'ATX', 'mATX', 'Mini-ITX'],
    maxGpuLength: 360, maxCoolerHeight: 170,
    psuFormFactors: ['ATX'], maxPsuLength: 220, expansionSlots: 7,
    // Two 120 mm fans ship in the box; one front and one rear per Corsair's quick start guide.
    includedFans: { front: [120], top: [], rear: [120] },
    // Top sizes are from Corsair's own comparison article, not the spec table.
    radiators: { front: [240, 280, 360], top: [240, 280], rear: [120] },
    bays: { ssd25: 2, hdd35: 2 },
    look: { front: 'mesh', slats: 0, top: 'mesh', frontIo: 'top-front', ports: { usbA: 1, usbC: 1, audio: 1 }, feet: 'pads', shroud: 'full' },
  },
  {
    id: 'nzxt-h5-flow-2024', category: 'case', brand: 'NZXT', name: 'H5 Flow', sku: 'CC-H52FB-01',
    source: 'https://nzxt.com/product/h5-flow',
    dims: { length: 430, width: 225, height: 465 },
    moboFormFactors: ['E-ATX', 'ATX', 'mATX', 'Mini-ITX'],
    maxGpuLength: 410, maxCoolerHeight: 170,
    psuFormFactors: ['ATX'], maxPsuLength: 200, expansionSlots: 7,
    includedFans: { front: [120], top: [], rear: [120] },
    radiators: { front: [120, 140, 240, 280, 360], top: [240], rear: [] },
    bays: { ssd25: 2, hdd35: 1 },
    look: { front: 'mesh', slats: 0, top: 'mesh', frontIo: 'top-front', ports: { usbA: 1, usbC: 1, audio: 1 }, feet: 'bars', shroud: 'vented' },
  },
  {
    id: 'lian-li-lancool-216', category: 'case', brand: 'Lian Li', name: 'Lancool 216', sku: 'LANCOOL 216RX',
    source: 'https://lian-li.com/product/lancool-216/',
    dims: { length: 480.9, width: 235, height: 491.7 },
    moboFormFactors: ['E-ATX', 'ATX', 'mATX', 'Mini-ITX'],
    maxGpuLength: 392, maxCoolerHeight: 180.5,
    psuFormFactors: ['ATX'], maxPsuLength: 220, expansionSlots: 7,
    includedFans: { front: [160, 160], top: [], rear: [140] },
    radiators: { front: [240, 280, 360], top: [240, 280, 360], rear: [] },
    bays: { ssd25: 4, hdd35: 2 },
    look: { front: 'mesh', slats: 0, top: 'mesh', frontIo: 'top-front', ports: { usbA: 2, usbC: 1, audio: 1 }, feet: 'pads', shroud: 'vented' },
  },
];
