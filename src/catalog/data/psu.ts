import type { PsuPart } from '../types.ts';

// Connector counts are from each maker's cable table. `eps8` counts 8-pin
// (or 4+4) CPU plugs; `hpwr16` counts 12VHPWR / 12V-2x6 plugs. `look` is read
// from each maker's photos; the two Corsair RM units have three-armed cut-outs,
// drawn here as triangles.
export const PSUS: PsuPart[] = [
  { id: 'msi-mag-a550bn', category: 'psu', brand: 'MSI', name: 'MAG A550BN', sku: 'MAG A550BN',
    source: 'https://www.msi.com/Power-Supply/MAG-A550BN/Specification',
    look: { switch: true, grille: 'hex', fan: 120 },
    wattage: 550, formFactor: 'ATX', length: 140, modular: 'none',
    connectors: { atx24: 1, eps8: 1, pcie8: 2, hpwr16: 0, sata: 5 } },
  { id: 'be-quiet-pure-power-12-m-650', category: 'psu', brand: 'be quiet!', name: 'Pure Power 12 M 650W', sku: 'BN342',
    source: 'https://www.bequiet.com/en/powersupply/4069',
    look: { switch: true, grille: 'hex', fan: 120 },
    wattage: 650, formFactor: 'ATX', length: 160, modular: 'full',
    connectors: { atx24: 1, eps8: 1, pcie8: 2, hpwr16: 1, sata: 5 } },
  { id: 'corsair-rm750e', category: 'psu', brand: 'Corsair', name: 'RM750e', sku: 'CP-9020295-NA',
    source: 'https://www.corsair.com/us/en/p/psu/cp-9020295-na/rme-series-rm750e-fully-modular-low-noise-atx-power-supply-cp-9020295-na',
    look: { switch: true, grille: 'tri', fan: 120 },
    wattage: 750, formFactor: 'ATX', length: 140, modular: 'full',
    connectors: { atx24: 1, eps8: 2, pcie8: 3, hpwr16: 1, sata: 6 } },
  { id: 'seasonic-focus-gx-850-atx3', category: 'psu', brand: 'Seasonic', name: 'Focus GX-850', sku: 'SSR-850FX3',
    source: 'https://seasonic.com/focus-gx-atx-3/',
    look: { switch: true, grille: 'hex', fan: 135 },
    wattage: 850, formFactor: 'ATX', length: 140, modular: 'full',
    connectors: { atx24: 1, eps8: 2, pcie8: 3, hpwr16: 1, sata: 8 } },
  { id: 'corsair-rm1000x-2024', category: 'psu', brand: 'Corsair', name: 'RM1000x', sku: 'CP-9020271-NA',
    source: 'https://www.corsair.com/us/en/p/psu/cp-9020271-na/rm1000x-fully-modular-low-noise-atx-power-supply-cp-9020271-na',
    look: { switch: true, grille: 'tri', fan: 140 },
    wattage: 1000, formFactor: 'ATX', length: 160, modular: 'full',
    connectors: { atx24: 1, eps8: 2, pcie8: 4, hpwr16: 1, sata: 12 } },
  { id: 'corsair-sf750-2024', category: 'psu', brand: 'Corsair', name: 'SF750', sku: 'CP-9020284-NA',
    source: 'https://www.corsair.com/us/en/p/psu/cp-9020284-na/sf750-fully-modular-low-noise-sfx-power-supply-cp-9020284-na',
    look: { switch: true, grille: 'hex', fan: 92 },
    wattage: 750, formFactor: 'SFX', length: 100, modular: 'full',
    connectors: { atx24: 1, eps8: 2, pcie8: 2, hpwr16: 1, sata: 8 } },
  // 4+4-pin CPU: two plugs on one daisy-chained cable (650 + 150 mm).
  { id: 'thermaltake-toughpower-gf-a3-650', category: 'psu', brand: 'Thermaltake', name: 'Toughpower GF A3 Gold 650W', sku: 'PS-TPD-0650FNFAGT-H',
    source: 'https://www.thermaltake.com/toughpower-gf-a3-gold-650w-tt-premium-edition.html',
    look: { switch: true, grille: 'slots', fan: 120 },
    wattage: 650, formFactor: 'ATX', length: 140, modular: 'full',
    connectors: { atx24: 1, eps8: 2, pcie8: 4, hpwr16: 1, sata: 8 } },
  // pcie8 counts the two plain 8-pin cables and the two plugs on the
  // 12V-2x6-to-dual-8-pin cable. That cable and the native 16-pin one both
  // end in a 12V-2x6 plug at the unit; Corsair's page does not say how many
  // such sockets it has, so they may not both be usable at once.
  { id: 'corsair-rm750x-2024', category: 'psu', brand: 'Corsair', name: 'RM750x', sku: 'CP-9020285-NA',
    source: 'https://www.corsair.com/us/en/p/psu/cp-9020285-na/rmx-series-rm750x-fully-modular-power-supply-cp-9020285-na',
    look: { switch: true, grille: 'tri', fan: 140 },
    wattage: 750, formFactor: 'ATX', length: 160, modular: 'full',
    connectors: { atx24: 1, eps8: 2, pcie8: 4, hpwr16: 1, sata: 8 } },
  { id: 'msi-mag-a850gl-pcie5', category: 'psu', brand: 'MSI', name: 'MAG A850GL PCIE5', sku: 'MAG A850GL PCIE5',
    source: 'https://www.msi.com/Power-Supply/MAG-A850GL-PCIE5/Specification',
    look: { switch: true, grille: 'hex', fan: 120 },
    wattage: 850, formFactor: 'ATX', length: 140, modular: 'full',
    connectors: { atx24: 1, eps8: 2, pcie8: 4, hpwr16: 1, sata: 8 } },
  { id: 'nzxt-c850-gold-atx-3-1', category: 'psu', brand: 'NZXT', name: 'C850 Gold (ATX 3.1)', sku: 'PA-8G2BB-US',
    source: 'https://nzxt.com/products/c850-gold-atx',
    look: { switch: true, grille: 'hex', fan: 135 },
    wattage: 850, formFactor: 'ATX', length: 160, modular: 'full',
    connectors: { atx24: 1, eps8: 2, pcie8: 3, hpwr16: 1, sata: 12 } },
  // ASUS lists "SATA x 5" without saying plugs or cables; read as plugs.
  { id: 'asus-tuf-gaming-1000g', category: 'psu', brand: 'ASUS', name: 'TUF Gaming 1000W Gold', sku: 'TUF-GAMING-1000G',
    source: 'https://www.asus.com/motherboards-components/power-supply-units/tuf-gaming/tuf-gaming-1000g/techspec/',
    look: { switch: true, grille: 'hex', fan: 135 }, // the fan size is on ASUS's overview page, not in its spec table
    wattage: 1000, formFactor: 'ATX', length: 150, modular: 'full',
    connectors: { atx24: 1, eps8: 2, pcie8: 4, hpwr16: 1, sata: 5 } },
  // SATA counts the four 4-plug cables and the 2-plug SATA 3.3 V cable.
  { id: 'seasonic-vertex-gx-1200', category: 'psu', brand: 'Seasonic', name: 'Vertex GX-1200', sku: 'VERTEX GX-1200',
    source: 'https://seasonic.com/vertex-gx/',
    look: { switch: true, grille: 'hex', fan: 135 },
    wattage: 1200, formFactor: 'ATX', length: 170, // datasheet says 170 mm, product page 160 mm; the longer is used
    modular: 'full',
    connectors: { atx24: 1, eps8: 2, pcie8: 3, hpwr16: 1, sata: 18 } },
];
