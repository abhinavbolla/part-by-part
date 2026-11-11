import type { StoragePart } from '../types.ts';

export const STORAGE: StoragePart[] = [
  { id: 'samsung-990-pro-1tb', category: 'storage', brand: 'Samsung', name: '990 Pro 1 TB', sku: 'MZ-V9P1T0BW',
    source: 'https://www.samsung.com/uk/memory-storage/nvme-ssd/990-pro-1tb-nvme-pcie-gen-4-mz-v9p1t0bw/',
    formFactor: 'M.2', length: 80, interface: 'nvme', capacityGb: 1000 },
  { id: 'kingston-kc3000-1tb', category: 'storage', brand: 'Kingston', name: 'KC3000 1 TB', sku: 'SKC3000S/1024G',
    source: 'https://www.kingston.com/datasheets/KC3000_us.pdf',
    formFactor: 'M.2', length: 80, interface: 'nvme', capacityGb: 1024 },
  { id: 'sk-hynix-platinum-p41-1tb', category: 'storage', brand: 'SK hynix', name: 'Platinum P41 1 TB',
    sku: 'SHPP41-1000GM-2', // part number as retailers list it; the maker's page gives none
    source: 'https://ssd.skhynix.com/platinum_p41/',
    formFactor: 'M.2', length: 80, interface: 'nvme', capacityGb: 1000 },
  { id: 'wd-black-sn850x-2tb', category: 'storage', brand: 'WD_BLACK', name: 'SN850X 2 TB', sku: 'WDS200T2X0E',
    source: 'https://www.sandisk.com/products/ssd/internal-ssd/wd-black-sn850x-nvme-ssd?sku=WDS200T2X0E',
    formFactor: 'M.2', length: 80, interface: 'nvme', capacityGb: 2000 },
  { id: 'wd-blue-sa510-m2-1tb', category: 'storage', brand: 'WD', name: 'Blue SA510 M.2 1 TB', sku: 'WDS100T3B0B',
    source: 'https://www.sandisk.com/products/ssd/internal-ssd/wd-blue-sa510-sata-m-2-ssd?sku=WDS100T3B0B',
    formFactor: 'M.2', length: 80, interface: 'sata', capacityGb: 1000 },
  { id: 'samsung-870-evo-1tb', category: 'storage', brand: 'Samsung', name: '870 EVO 1 TB', sku: 'MZ-77E1T0B/AM',
    source: 'https://www.samsung.com/us/computing/memory-storage/solid-state-drives/870-evo-sata-2-5-ssd-1tb-mz-77e1t0b-am/',
    formFactor: '2.5"', length: 100, interface: 'sata', capacityGb: 1000 },
];
