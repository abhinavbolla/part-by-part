import type { CoolerPart } from '../types.ts';

// `sockets` lists what the maker says is supported out of the box.
export const COOLERS: CoolerPart[] = [
  { id: 'cooler-master-hyper-212-black', category: 'cooler', brand: 'Cooler Master', name: 'Hyper 212 Black',
    sku: 'RR-S4KK-25SN-R1', source: 'https://www.coolermaster.com/en-global/products/hyper-212-black.html',
    kind: 'air', height: 152, width: 125, depth: 74,
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1851', 'LGA1200'], fanSize: 120, fans: 1, towers: 1 },
  { id: 'noctua-nh-u12s', category: 'cooler', brand: 'Noctua', name: 'NH-U12S', sku: 'NH-U12S',
    source: 'https://www.noctua.at/en/products/nh-u12s/specifications',
    kind: 'air', height: 158, width: 125, depth: 71,
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1851', 'LGA1200'], fanSize: 120, fans: 1, towers: 1 },
  { id: 'thermalright-peerless-assassin-120-se', category: 'cooler', brand: 'Thermalright',
    name: 'Peerless Assassin 120 SE', sku: 'Peerless Assassin 120 SE',
    source: 'https://www.thermalright.com/product/peerless-assassin-120-se/',
    kind: 'air', height: 155, width: 125,
    depth: 135, // derived: the 110 mm heatsink plus a 25 mm front fan
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1851', 'LGA1200'], fanSize: 120, fans: 2, towers: 2 },
  { id: 'deepcool-ak620', category: 'cooler', brand: 'DeepCool', name: 'AK620', sku: 'R-AK620-BKNNMT-G',
    source: 'https://www.deepcool.com/products/Cooling/cpuaircoolers/AK620-High-Performance-CPU-Cooler-1700-AM5/2021/13067.shtml',
    kind: 'air', height: 160, width: 129, depth: 138,
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1200'], fanSize: 120, fans: 2, towers: 2 },
  { id: 'be-quiet-dark-rock-pro-5', category: 'cooler', brand: 'be quiet!', name: 'Dark Rock Pro 5', sku: 'BK036',
    source: 'https://www.bequiet.com/en/cpucooler/4466',
    kind: 'air', height: 168, width: 136, depth: 145,
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1851', 'LGA1200'], fanSize: 120, fans: 2, towers: 2 },
  { id: 'noctua-nh-d15-g2', category: 'cooler', brand: 'Noctua', name: 'NH-D15 G2', sku: 'NH-D15 G2',
    source: 'https://www.noctua.at/en/products/nh-d15-g2/specifications',
    kind: 'air', height: 168, width: 150, depth: 152,
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1851', 'LGA1200'], fanSize: 140, fans: 2, towers: 2 },
  { id: 'corsair-nautilus-240-rs', category: 'cooler', brand: 'Corsair', name: 'Nautilus 240 RS', sku: 'CW-9060088-WW',
    source: 'https://www.corsair.com/us/en/p/cpu-coolers/cw-9060088-ww/nautilus-240-rs-liquid-cpu-cooler-cw-9060088-ww',
    // Radiator size is from Corsair's Nautilus RS article; the product page omits it.
    kind: 'aio', radiator: { size: 240, length: 276, width: 120, thickness: 27 },
    fanSize: 120, fans: 2,
    height: 50, // not published; drawn at a typical pump height
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1851'] },
  { id: 'arctic-liquid-freezer-iii-360', category: 'cooler', brand: 'Arctic', name: 'Liquid Freezer III 360',
    sku: 'ACFRE00136A', source: 'https://www.arctic.de/en/Liquid-Freezer-III-360/ACFRE00136A',
    kind: 'aio', radiator: { size: 360, length: 398, width: 120, thickness: 38 },
    fanSize: 120, fans: 3, height: 68.5,
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1851'] },
];
