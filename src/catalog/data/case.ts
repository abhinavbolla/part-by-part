import type { CasePart } from '../types.ts';

// `look` records what each case looks like in its maker's photos (studied
// 2026-11-11 and 2026-11-12): its panels and their perforation, the closed front section, the
// button and ports, feet, the rear panel and what is inside. Lengths taken from
// photos are estimates by proportion.
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
    look: {
      front: 'slats', slats: 10, holes: 'slits', frontDepth: 100, frontGap: 0, top: 'mesh', topSolidFront: 100,
      ioAt: 'near', ports: { usbA: 2, usbC: 1, audio: 2 }, reset: false, powerRound: true, feet: 'rounds',
      shroud: 'full', rearFan: 120, rearGrille: 'slots', rearVented: true, cableBar: false, pullTab: true,
    },
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
    look: {
      front: 'mesh', slats: 0, holes: 'triangles', frontDepth: 34, frontGap: 9, top: 'mesh', topSolidFront: 44,
      ioAt: 'centre', ports: { usbA: 1, usbC: 1, audio: 1 }, reset: true, powerRound: false, feet: 'wedges',
      shroud: 'full', rearFan: 120, rearGrille: 'hex', rearVented: false, cableBar: true, pullTab: false,
    },
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
    look: {
      front: 'mesh', slats: 0, holes: 'rounds', frontDepth: 30, frontGap: 0, top: 'mesh', topSolidFront: 0,
      ioAt: 'far', ports: { usbA: 1, usbC: 1, audio: 1 }, reset: false, powerRound: true, feet: 'bars',
      shroud: 'vented', rearFan: 120, rearGrille: 'hex', rearVented: true, cableBar: true, pullTab: false,
    },
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
    look: {
      front: 'mesh', slats: 0, holes: 'fine', frontDepth: 30, frontGap: 0, top: 'mesh', topSolidFront: 30,
      ioAt: 'near', ports: { usbA: 2, usbC: 1, audio: 1 }, reset: true, powerRound: false, feet: 'pads',
      shroud: 'vented', rearFan: 140, rearGrille: 'hex', rearVented: false, cableBar: false, pullTab: false,
    },
  },
  {
    id: 'fractal-pop-air-rgb-tg', category: 'case', brand: 'Fractal Design', name: 'Pop Air RGB', sku: 'FD-C-POR1A-06',
    source: 'https://www.fractal-design.com/products/cases/pop/pop-air/black-tg-clear-tint/',
    dims: { length: 473.5, width: 215, height: 454 },
    moboFormFactors: ['ATX', 'mATX', 'Mini-ITX'],
    maxGpuLength: 405, maxCoolerHeight: 170,
    psuFormFactors: ['ATX'], maxPsuLength: 170, expansionSlots: 7,
    includedFans: { front: [120, 120], top: [], rear: [120] },
    radiators: { front: [120, 240, 280], top: [120, 240], rear: [120] },
    // Two dedicated 2.5-inch mounts and three that take either size; it also has two 5.25-inch bays.
    bays: { ssd25: 2, hdd35: 3 },
    look: {
      // frontDepth and topSolidFront are estimates by proportion from the side and top photos.
      front: 'mesh', slats: 0, holes: 'fine', frontDepth: 50, frontGap: 0, top: 'mesh', topSolidFront: 165,
      ioAt: 'far', ports: { usbA: 2, usbC: 0, audio: 2 }, reset: false, powerRound: true, feet: 'pads',
      shroud: 'full', rearFan: 120, rearGrille: 'hex', rearVented: true, cableBar: false, pullTab: false,
    },
  },
  {
    id: 'fractal-meshify-2-compact-tg', category: 'case', brand: 'Fractal Design', name: 'Meshify 2 Compact', sku: 'FD-C-MES2C-02',
    source: 'https://www.fractal-design.com/products/cases/meshify/meshify-2-compact/black-tg-light-tint/',
    dims: { length: 424, width: 210, height: 475 },
    moboFormFactors: ['ATX', 'mATX', 'Mini-ITX'],
    maxGpuLength: 341, maxCoolerHeight: 169,
    psuFormFactors: ['ATX'], maxPsuLength: 200, expansionSlots: 7,
    // The page's spec table prints "Dynamic X2 GP-12 (front)" with no count; the same
    // page's product data reads "2x Dynamic X2 GP-14 Black, 1x Dynamic X2 GP-12 Black".
    includedFans: { front: [140, 140], top: [], rear: [120] },
    // A 120 mm bottom mount, under the shroud, is not recorded.
    radiators: { front: [120, 140, 240, 280, 360], top: [120, 240], rear: [120] },
    // Four dedicated 2.5-inch mounts and two that take either size.
    bays: { ssd25: 4, hdd35: 2 },
    look: {
      // frontDepth and topSolidFront are estimates by proportion from the side and top photos.
      front: 'mesh', slats: 0, holes: 'fine', frontDepth: 36, frontGap: 0, top: 'mesh', topSolidFront: 60,
      ioAt: 'centre', ports: { usbA: 2, usbC: 1, audio: 2 }, reset: true, powerRound: false, feet: 'pads',
      shroud: 'full', rearFan: 120, rearGrille: 'hex', rearVented: true, cableBar: false, pullTab: false,
    },
  },
  {
    id: 'phanteks-xt-pro', category: 'case', brand: 'Phanteks', name: 'XT Pro', sku: 'PH-XT523P1_BK01',
    source: 'https://phanteks.com/product/xt-pro/',
    dims: { length: 450, width: 230, height: 500 },
    moboFormFactors: ['E-ATX', 'ATX', 'mATX', 'Mini-ITX'],
    maxGpuLength: 415, maxCoolerHeight: 184,
    psuFormFactors: ['ATX'], maxPsuLength: 270, expansionSlots: 7,
    // One M25-120 fan ships in the box; the photos show it at the rear.
    includedFans: { front: [], top: [], rear: [120] },
    // The page prints maxima only (top 360, front 240, rear 120, all 120 mm
    // family; no 140 mm radiators); the smaller sizes are assumed to fit.
    radiators: { front: [120, 240], top: [120, 240, 360], rear: [120] },
    // A 2.5-inch bay (2x 2.5 or 1x 3.5) and a 3.5-inch bay (2x 3.5).
    bays: { ssd25: 2, hdd35: 2 },
    look: {
      // frontDepth and topSolidFront are estimates by proportion from the side and roof photos.
      front: 'mesh', slats: 0, holes: 'fine', frontDepth: 28, frontGap: 0, top: 'mesh', topSolidFront: 35,
      ioAt: 'far', ports: { usbA: 1, usbC: 1, audio: 1 }, reset: true, powerRound: true, feet: 'pads',
      shroud: 'full', rearFan: 120, rearGrille: 'slots', rearVented: true, cableBar: false, pullTab: false,
    },
  },
  {
    id: 'corsair-3000d-airflow', category: 'case', brand: 'Corsair', name: '3000D Airflow', sku: 'CC-9011251-WW',
    source: 'https://www.corsair.com/us/en/p/pc-cases/cc-9011251-ww/3000d-tempered-glass-mid-tower-black-cc-9011251-ww',
    dims: { length: 462, width: 230, height: 466 },
    // The spec table does not list board sizes; the tray in Corsair's own side
    // render is marked with standoff positions for ATX, Micro-ATX, ITX and E-ATX.
    moboFormFactors: ['E-ATX', 'ATX', 'mATX', 'Mini-ITX'],
    maxGpuLength: 360, maxCoolerHeight: 170,
    // Corsair's case explorer page gives 180 mm with the drive cage fitted and
    // 220 mm without it; the product page prints 220 mm.
    psuFormFactors: ['ATX'], maxPsuLength: 220, expansionSlots: 7,
    // Two SP120 fans ship fitted, one front and one rear, as the product renders show.
    includedFans: { front: [120], top: [], rear: [120] },
    // The spec table leaves the top out; Corsair's case explorer page and the
    // product page's capacity drawings give 240 and 280 mm in the roof.
    radiators: { front: [240, 280, 360], top: [240, 280], rear: [120] },
    // Two trays, each taking a 2.5in or a 3.5in drive.
    bays: { ssd25: 0, hdd35: 2 },
    look: {
      // frontDepth and topSolidFront are estimates by proportion from the renders.
      front: 'mesh', slats: 0, holes: 'triangles', frontDepth: 35, frontGap: 0, top: 'mesh', topSolidFront: 80,
      ioAt: 'centre', ports: { usbA: 2, usbC: 0, audio: 1 }, reset: true, powerRound: false, feet: 'pads',
      shroud: 'full', rearFan: 120, rearGrille: 'hex', rearVented: false, cableBar: true, pullTab: false,
    },
  },
  {
    id: 'corsair-5000d-airflow', category: 'case', brand: 'Corsair', name: '5000D Airflow', sku: 'CC-9011210-WW',
    source: 'https://www.corsair.com/us/en/p/pc-cases/cc-9011210-ww/5000d-airflow-tempered-glass-mid-tower-atx-pc-case-black-cc-9011210-ww',
    dims: { length: 520, width: 245, height: 520 },
    moboFormFactors: ['E-ATX', 'ATX', 'mATX', 'Mini-ITX'],
    maxGpuLength: 420, // the spec table's figure; the page's headline says "up to 400mm"
    maxCoolerHeight: 170,
    // Seven horizontal slots; the two vertical ones beside them are left out.
    psuFormFactors: ['ATX'], maxPsuLength: 250, expansionSlots: 7,
    // Two AirGuide 120 mm fans ship fitted, one front and one rear, as the product renders show.
    includedFans: { front: [120], top: [], rear: [120] },
    // The spec table leaves the top out; the page's text gives a 360 mm radiator
    // in the roof and its fan table 3x 120 / 2x 140 mm there. The side mount
    // (240 to 360 mm) has no place in this schema.
    radiators: { front: [240, 280, 360], top: [240, 280, 360], rear: [120] },
    bays: { ssd25: 4, hdd35: 2 },
    look: {
      // frontDepth, frontGap and topSolidFront are estimates by proportion from the renders.
      front: 'mesh', slats: 0, holes: 'triangles', frontDepth: 36, frontGap: 9, top: 'mesh', topSolidFront: 90,
      ioAt: 'centre', ports: { usbA: 2, usbC: 1, audio: 1 }, reset: true, powerRound: false, feet: 'wedges',
      shroud: 'full', rearFan: 120, rearGrille: 'hex', rearVented: true, cableBar: false, pullTab: false,
    },
  },
  {
    // Montech prints no part number; this is the EAN its spec table gives for the black case.
    id: 'montech-air-903-base', category: 'case', brand: 'Montech', name: 'AIR 903 BASE', sku: '4710562743784',
    source: 'https://www.montechpc.com/air-903-base',
    dims: { length: 478, width: 230, height: 493 },
    moboFormFactors: ['E-ATX', 'ATX', 'mATX', 'Mini-ITX'],
    maxGpuLength: 400, maxCoolerHeight: 180,
    psuFormFactors: ['ATX'], maxPsuLength: 240, expansionSlots: 7,
    includedFans: { front: [140, 140], top: [], rear: [140] },
    // Montech lists no rear radiator (KitGuru's review gives 120 mm there).
    radiators: { front: [120, 140, 240, 280, 360], top: [120, 140, 240, 280, 360], rear: [] },
    bays: { ssd25: 5, hdd35: 2 },
    look: {
      // frontDepth, frontGap and topSolidFront are estimates by proportion from the photos.
      front: 'mesh', slats: 0, holes: 'fine', frontDepth: 30, frontGap: 16, top: 'mesh', topSolidFront: 20,
      ioAt: 'far', ports: { usbA: 2, usbC: 1, audio: 2 }, reset: true, powerRound: false, feet: 'pads',
      shroud: 'full', rearFan: 140, rearGrille: 'hex', rearVented: true, cableBar: false, pullTab: false,
    },
  },
  {
    id: 'phanteks-eclipse-g400a', category: 'case', brand: 'Phanteks', name: 'Eclipse G400A', sku: 'PH-EC400GA_DBK01',
    source: 'https://phanteks.com/product/eclipse-g400a-black/',
    dims: { length: 495, width: 230, height: 522 },
    moboFormFactors: ['E-ATX', 'ATX', 'mATX', 'Mini-ITX'],
    maxGpuLength: 415, maxCoolerHeight: 184,
    psuFormFactors: ['ATX'], maxPsuLength: 270, expansionSlots: 7,
    // Four M25G2-140 fans ship fitted: three front, one rear. The lowest front
    // fan sits down in front of the shroud, as the photos show.
    includedFans: { front: [140, 140, 140], top: [], rear: [140] },
    // The page prints maxima only (top 360 or 280, rear 120, no front or bottom
    // radiator); the smaller sizes are assumed to fit.
    radiators: { front: [], top: [120, 140, 240, 280, 360], rear: [120] },
    // A 2.5-inch bay (2x 2.5 or 1x 3.5) and a 3.5-inch bay (2x 3.5).
    bays: { ssd25: 2, hdd35: 2 },
    look: {
      // frontDepth and topSolidFront are estimates by proportion from the side and roof photos.
      front: 'mesh', slats: 0, holes: 'fine', frontDepth: 30, frontGap: 0, top: 'mesh', topSolidFront: 30,
      // The spec table prints "1x USB 3.0"; the roof photo shows two USB-A ports.
      ioAt: 'far', ports: { usbA: 2, usbC: 1, audio: 1 }, reset: true, powerRound: true, feet: 'pads',
      shroud: 'vented', rearFan: 140, rearGrille: 'slots', rearVented: true, cableBar: false, pullTab: true,
    },
  },
];
