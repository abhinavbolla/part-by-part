import type { CoolerPart } from '../types.ts';

// `sockets` lists what the maker says is supported out of the box. `look` records
// what is visible in the maker's photos and dimension drawings (for three whose
// sites would not load, in reviews' photos of the same model): heat pipes, the
// depth of each fin stack, what finishes the top, the step cut for memory, the
// fans. Stack depths and cut-backs not on a drawing are estimates from photos.
export const COOLERS: CoolerPart[] = [
  { id: 'cooler-master-hyper-212-black', category: 'cooler', brand: 'Cooler Master', name: 'Hyper 212 Black',
    sku: 'RR-S4KK-25SN-R1', source: 'https://www.coolermaster.com/en-global/products/hyper-212-black.html',
    kind: 'air', height: 152, width: 125, depth: 74,
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1851', 'LGA1200'], fanSize: 120, fans: 1, towers: 1,
    look: { pipes: 4, stack: [45], top: 'plate', fins: 'plain', cutaway: [0, 0], fanFrame: 'square', blades: 7, clips: true } },
  { id: 'noctua-nh-u12s', category: 'cooler', brand: 'Noctua', name: 'NH-U12S', sku: 'NH-U12S',
    source: 'https://www.noctua.at/en/products/nh-u12s/specifications',
    kind: 'air', height: 158, width: 125, depth: 71,
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1851', 'LGA1200'], fanSize: 120, fans: 1, towers: 1,
    look: { pipes: 5, stack: [45], top: 'bare', fins: 'sawtooth', cutaway: [0, 0], fanFrame: 'square', blades: 7, clips: true } },
  { id: 'thermalright-peerless-assassin-120-se', category: 'cooler', brand: 'Thermalright',
    name: 'Peerless Assassin 120 SE', sku: 'Peerless Assassin 120 SE',
    source: 'https://www.thermalright.com/product/peerless-assassin-120-se/',
    kind: 'air', height: 155, width: 125,
    depth: 135, // derived: the 110 mm heatsink plus a 25 mm front fan
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1851', 'LGA1200'], fanSize: 120, fans: 2, towers: 2,
    look: { pipes: 6, stack: [40, 40], top: 'caps', fins: 'plain', cutaway: [20, 10], fanFrame: 'square', blades: 9, clips: true } },
  { id: 'deepcool-ak620', category: 'cooler', brand: 'DeepCool', name: 'AK620', sku: 'R-AK620-BKNNMT-G',
    source: 'https://www.deepcool.com/products/Cooling/cpuaircoolers/AK620-High-Performance-CPU-Cooler-1700-AM5/2021/13067.shtml',
    kind: 'air', height: 160, width: 129, depth: 138,
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1200'], fanSize: 120, fans: 2, towers: 2,
    look: { pipes: 6, stack: [40, 40], top: 'grid', fins: 'plain', cutaway: [10, 13], fanFrame: 'square', blades: 9, clips: true } },
  { id: 'be-quiet-dark-rock-pro-5', category: 'cooler', brand: 'be quiet!', name: 'Dark Rock Pro 5', sku: 'BK036',
    source: 'https://www.bequiet.com/en/cpucooler/4466',
    kind: 'air', height: 168, width: 136, depth: 145,
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1851', 'LGA1200'], fanSize: 120, fans: 2, towers: 2,
    // The middle fan is a 135 mm one with seven blades; one lid covers both towers and that fan.
    look: { pipes: 7, stack: [45, 44], top: 'hood', fins: 'plain', cutaway: [23, 15], fanFrame: 'square',
      fanSizes: [120, 135], fanBlades: [9, 7], blades: 9, clips: true } },
  { id: 'noctua-nh-d15-g2', category: 'cooler', brand: 'Noctua', name: 'NH-D15 G2', sku: 'NH-D15 G2',
    source: 'https://www.noctua.at/en/products/nh-d15-g2/specifications',
    kind: 'air', height: 168, width: 150, depth: 152,
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1851', 'LGA1200'], fanSize: 140, fans: 2, towers: 2,
    // The front tower is the slimmer one, and both sit about 10 mm off the base toward the top of the board.
    look: { pipes: 8, stack: [46, 51], top: 'bare', fins: 'sawtooth', cutaway: [15, 20], offset: 10, fanFrame: 'round', blades: 9, clips: true } },
  { id: 'thermalright-phantom-spirit-120-se', category: 'cooler', brand: 'Thermalright', name: 'Phantom Spirit 120 SE',
    sku: 'Phantom Spirit 120 SE', source: 'https://www.thermalright.com/product/phantom-spirit-120-se/',
    kind: 'air', height: 154, width: 125,
    depth: 135, // derived: the 110 mm heatsink plus a 25 mm front fan
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1851', 'LGA1200'], fanSize: 120, fans: 2, towers: 2,
    // Stack depths and the memory cut-back are measured on Thermalright's dimension drawing. The towers sit
    // about 7 mm off the base's middle; the block can be turned either way, and is drawn toward the top.
    look: { pipes: 7, stack: [40, 40], top: 'caps', fins: 'plain', cutaway: [26, 10], offset: 7, fanFrame: 'square', blades: 9, clips: true } },
  { id: 'thermalright-assassin-x-120-refined-se', category: 'cooler', brand: 'Thermalright',
    name: 'Assassin X 120 Refined SE', sku: 'Assassin X 120 Refined SE',
    source: 'https://www.thermalright.com/product/assassin-x-120-refined-se/',
    kind: 'air', height: 148, width: 120,
    depth: 71, // derived: the 46 mm heatsink plus a 25 mm fan
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1851', 'LGA1200'], fanSize: 120, fans: 1, towers: 1,
    look: { pipes: 4, stack: [46], top: 'caps', fins: 'sawtooth', cutaway: [0, 0], fanFrame: 'square', blades: 9, clips: true } },
  { id: 'deepcool-ak400', category: 'cooler', brand: 'DeepCool', name: 'AK400', sku: 'R-AK400-BKNNMN-G-1',
    source: 'https://www.deepcool.com/products/Cooling/cpuaircoolers/AK400-Performance-CPU-Cooler-1851-1700-AM5/2024/15222.shtml',
    // Depth is the heatsink and fan on DeepCool's dimension drawing; its 97 mm overall figure takes in the mounting bar.
    kind: 'air', height: 155, width: 127, depth: 73,
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1851', 'LGA1200'], fanSize: 120, fans: 1, towers: 1,
    look: { pipes: 4, stack: [45], top: 'grid', fins: 'sawtooth', cutaway: [0, 0], fanFrame: 'square', blades: 9, clips: true } },
  { id: 'deepcool-ag400-bk-argb', category: 'cooler', brand: 'DeepCool', name: 'AG400 BK ARGB', sku: 'R-AG400-BKANMC-G-2',
    source: 'https://www.deepcool.com/products/Cooling/cpuaircoolers/AG400-BK-ARGB-120mm-CPU-Cooler-1851-1700-AM5/2022/16085.shtml',
    // Depth is the heatsink and fan on DeepCool's dimension drawing; its 92 mm figure takes in the mounting bar.
    kind: 'air', height: 150, width: 125, depth: 72,
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1851', 'LGA1200'], fanSize: 120, fans: 1, towers: 1,
    look: { pipes: 4, stack: [45], top: 'bare', fins: 'plain', cutaway: [0, 0], fanFrame: 'square', blades: 9, clips: true } },
  { id: 'noctua-nh-u12s-redux', category: 'cooler', brand: 'Noctua', name: 'NH-U12S redux', sku: 'NH-U12S redux',
    source: 'https://www.noctua.at/en/products/nh-u12s-redux/specifications',
    kind: 'air', height: 158, width: 125, depth: 71,
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1851', 'LGA1200'], fanSize: 120, fans: 1, towers: 1,
    look: { pipes: 4, stack: [45], top: 'bare', fins: 'sawtooth', cutaway: [0, 0], fanFrame: 'square', blades: 7, clips: true } },
  { id: 'corsair-nautilus-240-rs', category: 'cooler', brand: 'Corsair', name: 'Nautilus 240 RS', sku: 'CW-9060088-WW',
    source: 'https://www.corsair.com/us/en/p/cpu-coolers/cw-9060088-ww/nautilus-240-rs-liquid-cpu-cooler-cw-9060088-ww',
    // Radiator size is from Corsair's Nautilus RS article; the product page omits it.
    kind: 'aio', radiator: { size: 240, length: 276, width: 120, thickness: 27 },
    fanSize: 120, fans: 2,
    height: 58, // not published; block size and hose thickness are estimates from Corsair's photos
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1851'],
    look: { block: 'square', blockSize: 72, cap: 'disc', hose: 14, blades: 7 } },
  { id: 'arctic-liquid-freezer-iii-360', category: 'cooler', brand: 'Arctic', name: 'Liquid Freezer III 360',
    sku: 'ACFRE00136A', source: 'https://www.arctic.de/en/Liquid-Freezer-III-360/ACFRE00136A',
    kind: 'aio', radiator: { size: 360, length: 398, width: 120, thickness: 38 },
    fanSize: 120, fans: 3, height: 68.5,
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1851'],
    look: { block: 'round', blockSize: 91, cap: 'vanes', hose: 12.4, blades: 5 } },
  { id: 'arctic-liquid-freezer-iii-240', category: 'cooler', brand: 'Arctic', name: 'Liquid Freezer III 240',
    sku: 'ACFRE00134A', source: 'https://www.arctic.de/en/Liquid-Freezer-III-240/ACFRE00134A',
    kind: 'aio', radiator: { size: 240, length: 277, width: 120, thickness: 38 },
    fanSize: 120, fans: 2, height: 68.5,
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1851'],
    look: { block: 'round', blockSize: 91, cap: 'vanes', hose: 12.4, blades: 5 } },
  { id: 'nzxt-kraken-plus-240', category: 'cooler', brand: 'NZXT', name: 'Kraken Plus 240',
    sku: 'RL-KN240-B2', source: 'https://nzxt.com/en-intl/products/kraken-plus-240',
    kind: 'aio', radiator: { size: 240, length: 281, width: 120, thickness: 27 },
    fanSize: 120, fans: 2,
    height: 56, // NZXT's "cap height", 55.97 mm, taken as the block's height above the CPU
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1851', 'LGA1200'],
    // The top is a round 1.54-inch screen in a plain bezel; drawn as the flat disc.
    look: { block: 'round', blockSize: 73,
      hose: 13, // not published; estimated from NZXT's photos against the 73 mm cap
      cap: 'disc', blades: 7 } },
  { id: 'deepcool-lt720', category: 'cooler', brand: 'DeepCool', name: 'LT720', sku: 'R-LT720-BKAMNF-G-1',
    source: 'https://www.deepcool.com/products/Cooling/cpuliquidcoolers/LT720-360mm-Liquid-CPU-Cooler-1851-1700-AM5/2024/16286.shtml',
    kind: 'aio', radiator: { size: 360, length: 402, width: 120, thickness: 27 },
    fanSize: 120, fans: 3, height: 68,
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1851', 'LGA1200'],
    // An 80 mm square block (94 mm with its fittings) whose top is an infinity mirror
    // under a stepped, slanted grey cover; drawn as a square block with a flat disc.
    look: { block: 'square', blockSize: 80, cap: 'disc',
      hose: 12, // not published; estimated from DeepCool's photos against the 80 mm block
      blades: 9 } },
  { id: 'lian-li-galahad-ii-trinity-360', category: 'cooler', brand: 'Lian Li', name: 'Galahad II Trinity 360',
    sku: 'GA2T36B', source: 'https://lian-li.com/product/galahad-ii-trinity/',
    kind: 'aio', radiator: { size: 360, length: 397.5, width: 119.2, thickness: 27 },
    fanSize: 120, fans: 3,
    height: 69, // the last figure of Lian Li's "74 x 74 x 69 mm" pump size, taken as the height
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1851', 'LGA1200'],
    // A round block whose top is an infinity mirror sunk inside a raised brushed-metal ring
    // above a lit band; drawn as a round block with a flat disc.
    look: { block: 'round', blockSize: 74, cap: 'disc',
      hose: 13, // not published ("20% bigger" only); estimated from Lian Li's photos against the 74 mm block
      blades: 9 } }, // Lian Li's photos blur the fans; nine is from its own fan icon and is not confirmed
  { id: 'corsair-nautilus-360-rs', category: 'cooler', brand: 'Corsair', name: 'Nautilus 360 RS', sku: 'CW-9060089-WW',
    source: 'https://www.corsair.com/us/en/p/cpu-coolers/cw-9060089-ww/nautilus-360-rs-liquid-cpu-cooler-cw-9060089-ww',
    // Radiator width and thickness are from Corsair's Nautilus RS article; the product page prints the size class and the 396 mm length.
    kind: 'aio', radiator: { size: 360, length: 396, width: 120, thickness: 27 },
    fanSize: 120, fans: 3,
    height: 58, // not published; same block as the 240 RS, so its block and hose estimates carry over
    sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1851'],
    look: { block: 'square', blockSize: 72, cap: 'disc', hose: 14, blades: 7 } },
];
