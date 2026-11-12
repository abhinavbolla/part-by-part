// The catalog. Every entry was entered by hand from its manufacturer's own
// product page (read 2026-11-11 and 2026-11-12) and records that page in `source`. Values a
// maker does not print are marked where they appear.

import { CASES } from './data/case.ts';
import { COOLERS } from './data/cooler.ts';
import { CPUS } from './data/cpu.ts';
import { GPUS } from './data/gpu.ts';
import { MOTHERBOARDS } from './data/motherboard.ts';
import { PSUS } from './data/psu.ts';
import { RAM } from './data/ram.ts';
import { STORAGE } from './data/storage.ts';
import type { CasePart, CatalogItem, Category, Part } from './types.ts';

export { CASES };

export const PARTS: Part[] = [
  ...MOTHERBOARDS,
  ...CPUS,
  ...COOLERS,
  ...RAM,
  ...STORAGE,
  ...GPUS,
  ...PSUS,
];

export const DEFAULT_CASE: CasePart = CASES[0];

export const CATALOG: CatalogItem[] = [...CASES, ...PARTS];

export function itemsIn(category: Category): CatalogItem[] {
  return CATALOG.filter((item) => item.category === category);
}

export function itemById(id: string): CatalogItem | undefined {
  return CATALOG.find((item) => item.id === id);
}
