// Catalog schema. All lengths are millimetres, all power figures watts.
// Every part records the manufacturer page its specs were read from.

export type Category =
  | 'case'
  | 'motherboard'
  | 'cpu'
  | 'cooler'
  | 'ram'
  | 'storage'
  | 'gpu'
  | 'psu';

export type FormFactor = 'ATX' | 'mATX' | 'Mini-ITX' | 'E-ATX';
export type PsuFormFactor = 'ATX' | 'SFX' | 'SFX-L';
export type RamType = 'DDR4' | 'DDR5';
export type StorageInterface = 'nvme' | 'sata';

interface Base {
  id: string;
  brand: string;
  name: string;
  sku: string;
  /** Manufacturer page the specs were read from. */
  source: string;
}

export interface CasePart extends Base {
  category: 'case';
  /** Outer size: length (front to back), width, height. */
  dims: { length: number; width: number; height: number };
  moboFormFactors: FormFactor[];
  maxGpuLength: number;
  maxCoolerHeight: number;
  psuFormFactors: PsuFormFactor[];
  maxPsuLength: number;
  expansionSlots: number;
}

export interface M2Slot {
  maxLength: number;
  interfaces: StorageInterface[];
}

export interface MotherboardPart extends Base {
  category: 'motherboard';
  socket: string;
  chipset: string;
  formFactor: FormFactor;
  ramType: RamType;
  ramSlots: number;
  maxRamGb: number;
  m2Slots: M2Slot[];
  sataPorts: number;
  pcieX16Slots: number;
  /** 8-pin CPU power sockets on the board. */
  epsConnectors: number;
}

export interface CpuPart extends Base {
  category: 'cpu';
  socket: string;
  cores: number;
  threads: number;
  /** Rated TDP / processor base power. */
  tdp: number;
  /** Sustained peak package power, used for the power estimate. */
  peakPower: number;
  igpu: boolean;
  /** Package outline, used to draw it. */
  pkg: { w: number; h: number };
}

export interface CoolerPart extends Base {
  category: 'cooler';
  kind: 'air';
  /** Height above the CPU, fan included. */
  height: number;
  width: number;
  depth: number;
  sockets: string[];
  fanSize: number;
}

export interface RamPart extends Base {
  category: 'ram';
  ramType: RamType;
  modules: number;
  gbPerModule: number;
  speed: number;
  height: number;
}

export interface StoragePart extends Base {
  category: 'storage';
  formFactor: 'M.2';
  length: number;
  interface: StorageInterface;
  capacityGb: number;
}

export interface GpuPart extends Base {
  category: 'gpu';
  length: number;
  height: number;
  thickness: number;
  /** Slot width as the maker states it, e.g. 2.56. */
  slots: number;
  /** Board power under load. */
  power: number;
  connectors: { pcie8: number; hpwr16: number };
  recommendedPsu: number;
  fans: number;
}

export interface PsuPart extends Base {
  category: 'psu';
  wattage: number;
  formFactor: PsuFormFactor;
  length: number;
  connectors: { atx24: number; eps8: number; pcie8: number; hpwr16: number; sata: number };
}

export type Part =
  | MotherboardPart
  | CpuPart
  | CoolerPart
  | RamPart
  | StoragePart
  | GpuPart
  | PsuPart;

/** Categories the user installs. The case is the fixed starting point. */
export type SlotCategory = Part['category'];

export const SLOT_ORDER: SlotCategory[] = [
  'motherboard',
  'cpu',
  'cooler',
  'ram',
  'storage',
  'gpu',
  'psu',
];

export const CATEGORY_LABEL: Record<SlotCategory, string> = {
  motherboard: 'Motherboard',
  cpu: 'Processor',
  cooler: 'CPU cooler',
  ram: 'Memory',
  storage: 'Storage',
  gpu: 'Graphics card',
  psu: 'Power supply',
};
