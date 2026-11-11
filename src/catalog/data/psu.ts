import type { PsuPart } from '../types.ts';

// Connector counts are from each maker's cable table. `eps8` counts 8-pin
// (or 4+4) CPU plugs; `hpwr16` counts 12VHPWR / 12V-2x6 plugs.
export const PSUS: PsuPart[] = [
  { id: 'msi-mag-a550bn', category: 'psu', brand: 'MSI', name: 'MAG A550BN', sku: 'MAG A550BN',
    source: 'https://www.msi.com/Power-Supply/MAG-A550BN/Specification',
    wattage: 550, formFactor: 'ATX', length: 140, modular: 'none',
    connectors: { atx24: 1, eps8: 1, pcie8: 2, hpwr16: 0, sata: 5 } },
  { id: 'be-quiet-pure-power-12-m-650', category: 'psu', brand: 'be quiet!', name: 'Pure Power 12 M 650W', sku: 'BN342',
    source: 'https://www.bequiet.com/en/powersupply/4069',
    wattage: 650, formFactor: 'ATX', length: 160, modular: 'full',
    connectors: { atx24: 1, eps8: 1, pcie8: 2, hpwr16: 1, sata: 5 } },
  { id: 'corsair-rm750e', category: 'psu', brand: 'Corsair', name: 'RM750e', sku: 'CP-9020295-NA',
    source: 'https://www.corsair.com/us/en/p/psu/cp-9020295-na/rme-series-rm750e-fully-modular-low-noise-atx-power-supply-cp-9020295-na',
    wattage: 750, formFactor: 'ATX', length: 140, modular: 'full',
    connectors: { atx24: 1, eps8: 2, pcie8: 3, hpwr16: 1, sata: 6 } },
  { id: 'seasonic-focus-gx-850-atx3', category: 'psu', brand: 'Seasonic', name: 'Focus GX-850', sku: 'SSR-850FX3',
    source: 'https://seasonic.com/focus-gx-atx-3/',
    wattage: 850, formFactor: 'ATX', length: 140, modular: 'full',
    connectors: { atx24: 1, eps8: 2, pcie8: 3, hpwr16: 1, sata: 8 } },
  { id: 'corsair-rm1000x-2024', category: 'psu', brand: 'Corsair', name: 'RM1000x', sku: 'CP-9020271-NA',
    source: 'https://www.corsair.com/us/en/p/psu/cp-9020271-na/rm1000x-fully-modular-low-noise-atx-power-supply-cp-9020271-na',
    wattage: 1000, formFactor: 'ATX', length: 160, modular: 'full',
    connectors: { atx24: 1, eps8: 2, pcie8: 4, hpwr16: 1, sata: 12 } },
  { id: 'corsair-sf750-2024', category: 'psu', brand: 'Corsair', name: 'SF750', sku: 'CP-9020284-NA',
    source: 'https://www.corsair.com/us/en/p/psu/cp-9020284-na/sf750-fully-modular-low-noise-sfx-power-supply-cp-9020284-na',
    wattage: 750, formFactor: 'SFX', length: 100, modular: 'full',
    connectors: { atx24: 1, eps8: 2, pcie8: 2, hpwr16: 1, sata: 8 } },
];
