// Catalog schema. All lengths are millimetres, all power figures watts.
// Every part records the manufacturer page its specs were read from.

export type FormFactor = 'E-ATX' | 'ATX' | 'mATX' | 'Mini-ITX';
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

/** Fan or radiator sizes by where they mount. */
export interface ByPosition {
  front: number[];
  top: number[];
  rear: number[];
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
  /** Sizes of the fans that ship in the box. */
  includedFans: ByPosition;
  /** Radiator sizes each position accepts. */
  radiators: ByPosition;
  bays: { ssd25: number; hdd35: number };
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
  fanHeaders: number;
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
}

interface CoolerBase extends Base {
  category: 'cooler';
  sockets: string[];
  fanSize: number;
  fans: number;
}

export interface AirCoolerPart extends CoolerBase {
  kind: 'air';
  /** Height above the CPU, fans included. */
  height: number;
  width: number;
  depth: number;
  towers: number;
}

export interface LiquidCoolerPart extends CoolerBase {
  kind: 'aio';
  radiator: { size: number; length: number; width: number; thickness: number };
  /** Pump block height above the CPU. */
  height: number;
}

export type CoolerPart = AirCoolerPart | LiquidCoolerPart;

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
  formFactor: 'M.2' | '2.5"';
  length: number;
  interface: StorageInterface;
  capacityGb: number;
}

export interface GpuPart extends Base {
  category: 'gpu';
  /** The graphics chip, without the board maker. */
  chip: string;
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
  modular: 'full' | 'semi' | 'none';
  connectors: { atx24: number; eps8: number; pcie8: number; hpwr16: number; sata: number };
}

/** Things bought from the catalog and seated in the case. */
export type Part =
  | MotherboardPart
  | CpuPart
  | CoolerPart
  | RamPart
  | StoragePart
  | GpuPart
  | PsuPart;

export type SlotCategory = Part['category'];
export type Category = SlotCategory | 'case';
export type CatalogItem = Part | CasePart;

export type CableKind =
  | 'atx24'
  | 'eps'
  | 'gpu'
  | 'sata'
  | 'cooler'
  | 'front';

/**
 * A cable run. Cables are not catalog items: which ones a build needs follows
 * from the parts in it. They are steps in the build like any part.
 */
export interface CablePart {
  id: string;
  category: 'cable';
  kind: CableKind;
  name: string;
  /** What it does, shown under the name. */
  detail: string;
  /** Id of the part at the far end, when it has one. */
  target?: string;
  /** Needed for the machine to start. */
  required: boolean;
}

/** Anything that occupies a step of the build. */
export type Step = Part | CablePart;

export const SLOT_ORDER: SlotCategory[] = [
  'motherboard',
  'cpu',
  'cooler',
  'ram',
  'storage',
  'gpu',
  'psu',
];

export const CATEGORY_ORDER: Category[] = ['case', ...SLOT_ORDER];

export const CATEGORY_LABEL: Record<Category, string> = {
  case: 'Case',
  motherboard: 'Motherboard',
  cpu: 'Processor',
  cooler: 'CPU cooler',
  ram: 'Memory',
  storage: 'Storage',
  gpu: 'Graphics card',
  psu: 'Power supply',
};

export const CATEGORY_PLURAL: Record<Category, string> = {
  case: 'Cases',
  motherboard: 'Motherboards',
  cpu: 'Processors',
  cooler: 'CPU coolers',
  ram: 'Memory',
  storage: 'Storage',
  gpu: 'Graphics cards',
  psu: 'Power supplies',
};

export const isCable = (step: Step): step is CablePart => step.category === 'cable';
