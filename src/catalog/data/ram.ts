import type { RamPart } from '../types.ts';

// Module heights come from each maker's dimensions table or datasheet, which
// is often separate from the product page.
export const RAM: RamPart[] = [
  { id: 'corsair-vengeance-ddr5-32-6000', category: 'ram', brand: 'Corsair', name: 'Vengeance DDR5 32 GB',
    sku: 'CMK32GX5M2E6000C36',
    source: 'https://www.corsair.com/us/en/p/memory/cmk32gx5m2e6000c36/vengeance-32gb-2x16gb-ddr5-dram-6000mhz-c36-memory-kit-black-cmk32gx5m2e6000c36',
    ramType: 'DDR5', modules: 2, gbPerModule: 16, speed: 6000, height: 35, look: { top: 'flat' } },
  { id: 'kingston-fury-beast-ddr5-32-6000', category: 'ram', brand: 'Kingston', name: 'Fury Beast DDR5 32 GB',
    sku: 'KF560C30BBK2-32', source: 'https://www.kingston.com/datasheets/KF560C30BBK2-32.pdf',
    ramType: 'DDR5', modules: 2, gbPerModule: 16, speed: 6000, height: 34.9, look: { top: 'flat' } },
  { id: 'crucial-pro-ddr5-32-5600', category: 'ram', brand: 'Crucial', name: 'Pro DDR5 32 GB', sku: 'CP2K16G56C46U5',
    source: 'https://www.crucial.com/memory/ddr5/cp2k16g56c46u5',
    ramType: 'DDR5', modules: 2, gbPerModule: 16, speed: 5600,
    height: 31.9, look: { top: 'flat' } }, // from reseller spec sheets; crucial.com does not print it
  { id: 'gskill-trident-z5-rgb-32-6000', category: 'ram', brand: 'G.Skill', name: 'Trident Z5 RGB DDR5 32 GB',
    sku: 'F5-6000J3040F16GX2-TZ5RK',
    source: 'https://www.gskill.com/product/165/374/1649235161/F5-6000J3040F16GX2-TZ5RK-F5-6000J3040F16GA2-TZ5RK',
    ramType: 'DDR5', modules: 2, gbPerModule: 16, speed: 6000, height: 44, look: { top: 'lightbar' } },
  { id: 'corsair-dominator-titanium-64-6000', category: 'ram', brand: 'Corsair', name: 'Dominator Titanium DDR5 64 GB',
    sku: 'CMP64GX5M2B6000C30',
    source: 'https://www.corsair.com/us/en/p/memory/cmp64gx5m2b6000c30/dominator-titanium-rgb-64gb-2x32gb-ddr5-dram-6000mt-s-cl30-intel-xmp-memory-kit-black-cmp64gx5m2b6000c30',
    ramType: 'DDR5', modules: 2, gbPerModule: 32, speed: 6000, height: 56.75, look: { top: 'lightbar' } },
  { id: 'corsair-vengeance-lpx-ddr4-16-3200', category: 'ram', brand: 'Corsair', name: 'Vengeance LPX DDR4 16 GB',
    sku: 'CMK16GX4M2B3200C16',
    source: 'https://www.corsair.com/us/en/p/memory/cmk16gx4m2b3200c16/vengeance-lpx-16gb-2-x-8gb-ddr4-dram-3200mhz-c16-memory-kit-black-cmk16gx4m2b3200c16',
    ramType: 'DDR4', modules: 2, gbPerModule: 8, speed: 3200, height: 33.5, look: { top: 'fins' } },
  { id: 'gskill-ripjaws-v-32-3600', category: 'ram', brand: 'G.Skill', name: 'Ripjaws V DDR4 32 GB',
    sku: 'F4-3600C16D-32GVKC',
    source: 'https://www.gskill.com/specification/165/184/1562831784/F4-3600C16D-32GVKC-Specification',
    ramType: 'DDR4', modules: 2, gbPerModule: 16, speed: 3600, height: 42, look: { top: 'peaked' } },
];
