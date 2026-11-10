// Compatibility rules. Pure functions over catalog data: no DOM, no 3D.
// "block" means the part physically will not go in; "warn" means it fits but
// the build is unwise or will not run.

import type {
  CasePart,
  CoolerPart,
  CpuPart,
  GpuPart,
  MotherboardPart,
  Part,
  PsuPart,
  RamPart,
  SlotCategory,
  StoragePart,
} from '../catalog/types.ts';
import { CATEGORY_LABEL } from '../catalog/types.ts';

export interface Slots {
  case: CasePart;
  motherboard?: MotherboardPart;
  cpu?: CpuPart;
  cooler?: CoolerPart;
  ram?: RamPart;
  storage?: StoragePart;
  gpu?: GpuPart;
  psu?: PsuPart;
}

export interface Issue {
  level: 'block' | 'warn';
  code: string;
  message: string;
  /** Ids of the parts involved. */
  parts: string[];
  /** A warning that also stops the machine from running. */
  stopsBoot?: boolean;
}

/** What must already be seated before a part of each category can go in. */
export const REQUIRES: Record<SlotCategory, SlotCategory[]> = {
  motherboard: [],
  cpu: ['motherboard'],
  cooler: ['cpu'],
  ram: ['motherboard'],
  storage: ['motherboard'],
  gpu: ['motherboard'],
  psu: [],
};

/** Watts for the board, memory, drives and fans. */
const BASE_LOAD = 60;

export function slotsFrom(pcCase: CasePart, parts: Part[]): Slots {
  const slots: Slots = { case: pcCase };
  for (const part of parts) setSlot(slots, part);
  return slots;
}

function setSlot(slots: Slots, part: Part): void {
  switch (part.category) {
    case 'motherboard': slots.motherboard = part; break;
    case 'cpu': slots.cpu = part; break;
    case 'cooler': slots.cooler = part; break;
    case 'ram': slots.ram = part; break;
    case 'storage': slots.storage = part; break;
    case 'gpu': slots.gpu = part; break;
    case 'psu': slots.psu = part; break;
  }
}

export function estimatedLoad(slots: Slots): number {
  if (!slots.motherboard) return 0;
  return BASE_LOAD + (slots.cpu?.peakPower ?? 0) + (slots.gpu?.power ?? 0);
}

/** Every rule that applies to the parts present, in a stable order. */
export function evaluate(slots: Slots): Issue[] {
  const out: Issue[] = [];
  const { case: pcCase, motherboard: board, cpu, cooler, ram, storage, gpu, psu } = slots;

  if (board && !pcCase.moboFormFactors.includes(board.formFactor)) {
    out.push({
      level: 'block',
      code: 'board-form-factor',
      message: `${board.name} is ${board.formFactor}; the ${pcCase.name} takes ${pcCase.moboFormFactors.join(', ')}.`,
      parts: [board.id],
    });
  }

  if (board && cpu && cpu.socket !== board.socket) {
    out.push({
      level: 'block',
      code: 'cpu-socket',
      message: `${cpu.name} needs an ${cpu.socket} socket; this board is ${board.socket}.`,
      parts: [cpu.id, board.id],
    });
  }

  if (board && cooler && !cooler.sockets.includes(board.socket)) {
    out.push({
      level: 'block',
      code: 'cooler-socket',
      message: `${cooler.name} has no mounting kit for ${board.socket}.`,
      parts: [cooler.id, board.id],
    });
  }

  if (cooler && cooler.height > pcCase.maxCoolerHeight) {
    out.push({
      level: 'block',
      code: 'cooler-height',
      message: `${cooler.name} is ${cooler.height} mm tall; the ${pcCase.name} clears ${pcCase.maxCoolerHeight} mm.`,
      parts: [cooler.id],
    });
  }

  if (board && ram) {
    if (ram.ramType !== board.ramType) {
      out.push({
        level: 'block',
        code: 'ram-type',
        message: `${ram.name} is ${ram.ramType}; this board's slots are keyed for ${board.ramType}.`,
        parts: [ram.id, board.id],
      });
    } else if (ram.modules > board.ramSlots) {
      out.push({
        level: 'block',
        code: 'ram-slots',
        message: `${ram.name} is ${ram.modules} modules; this board has ${board.ramSlots} slots.`,
        parts: [ram.id, board.id],
      });
    } else if (ram.modules * ram.gbPerModule > board.maxRamGb) {
      out.push({
        level: 'warn',
        code: 'ram-capacity',
        message: `${ram.modules * ram.gbPerModule} GB is more than the ${board.maxRamGb} GB this board supports.`,
        parts: [ram.id, board.id],
      });
    }
  }

  if (board && storage) {
    const fits = board.m2Slots.some(
      (slot) => slot.interfaces.includes(storage.interface) && storage.length <= slot.maxLength,
    );
    if (!fits) {
      out.push({
        level: 'block',
        code: 'm2-slot',
        message: `No M.2 slot on this board takes a ${storage.length} mm ${storage.interface.toUpperCase()} drive.`,
        parts: [storage.id, board.id],
      });
    }
  }

  if (gpu) {
    if (gpu.length > pcCase.maxGpuLength) {
      out.push({
        level: 'block',
        code: 'gpu-length',
        message: `${gpu.name} is ${gpu.length} mm long; the ${pcCase.name} has room for ${pcCase.maxGpuLength} mm.`,
        parts: [gpu.id],
      });
    }
    // The card sits in the second slot position and grows downward from there.
    if (Math.ceil(gpu.slots) > pcCase.expansionSlots - 1) {
      out.push({
        level: 'block',
        code: 'gpu-slots',
        message: `${gpu.name} covers ${Math.ceil(gpu.slots)} slots; the case has ${pcCase.expansionSlots - 1} below the first.`,
        parts: [gpu.id],
      });
    }
    if (board && board.pcieX16Slots < 1) {
      out.push({
        level: 'block',
        code: 'gpu-no-slot',
        message: `This board has no x16 slot for a graphics card.`,
        parts: [gpu.id, board.id],
      });
    }
  }

  if (psu) {
    if (!pcCase.psuFormFactors.includes(psu.formFactor)) {
      out.push({
        level: 'block',
        code: 'psu-form-factor',
        message: `${psu.name} is ${psu.formFactor}; the ${pcCase.name} takes ${pcCase.psuFormFactors.join(', ')}.`,
        parts: [psu.id],
      });
    }
    if (psu.length > pcCase.maxPsuLength) {
      out.push({
        level: 'block',
        code: 'psu-length',
        message: `${psu.name} is ${psu.length} mm long; the bay takes ${pcCase.maxPsuLength} mm.`,
        parts: [psu.id],
      });
    }
    if (gpu) {
      if (gpu.connectors.hpwr16 > psu.connectors.hpwr16) {
        out.push({
          level: 'warn',
          code: 'psu-gpu-16pin',
          message: `${gpu.name} needs a 16-pin (12VHPWR) cable; ${psu.name} has none.`,
          parts: [psu.id, gpu.id],
          stopsBoot: true,
        });
      }
      if (gpu.connectors.pcie8 > psu.connectors.pcie8) {
        out.push({
          level: 'warn',
          code: 'psu-gpu-8pin',
          message: `${gpu.name} needs ${gpu.connectors.pcie8} × 8-pin PCIe; ${psu.name} has ${psu.connectors.pcie8}.`,
          parts: [psu.id, gpu.id],
          stopsBoot: true,
        });
      }
    }
    if (board && psu.connectors.eps8 < board.epsConnectors) {
      out.push({
        level: 'warn',
        code: 'psu-eps',
        message: `The board has ${board.epsConnectors} CPU power sockets; ${psu.name} has ${psu.connectors.eps8} cable.`,
        parts: [psu.id, board.id],
      });
    }
    const load = estimatedLoad(slots);
    if (load > psu.wattage) {
      out.push({
        level: 'warn',
        code: 'psu-wattage',
        message: `Estimated load is ${load} W; ${psu.name} supplies ${psu.wattage} W.`,
        parts: [psu.id, ...(gpu ? [gpu.id] : []), ...(cpu ? [cpu.id] : [])],
        stopsBoot: true,
      });
    } else if (gpu && psu.wattage < gpu.recommendedPsu) {
      out.push({
        level: 'warn',
        code: 'psu-recommended',
        message: `The maker of ${gpu.name} recommends ${gpu.recommendedPsu} W; ${psu.name} is ${psu.wattage} W.`,
        parts: [psu.id, gpu.id],
      });
    }
  }

  return out;
}

/** Issues that adding `part` would cause. Any "block" means it cannot go in. */
export function checkAdd(slots: Slots, part: Part): Issue[] {
  const occupant = slots[part.category];
  if (occupant && occupant.id !== part.id) {
    return [{
      level: 'block',
      code: 'occupied',
      message: `${occupant.name} is already there. Remove it first.`,
      parts: [part.id, occupant.id],
    }];
  }
  for (const needed of REQUIRES[part.category]) {
    if (!slots[needed]) {
      return [{
        level: 'block',
        code: 'needs-' + needed,
        message: `Seat a ${CATEGORY_LABEL[needed].toLowerCase()} first.`,
        parts: [part.id],
      }];
    }
  }
  const next: Slots = { ...slots };
  setSlot(next, part);
  return evaluate(next).filter((issue) => issue.parts.includes(part.id));
}

export function isBlocked(issues: Issue[]): boolean {
  return issues.some((issue) => issue.level === 'block');
}

/** Why a seated part cannot come out yet, or null if it can. */
export function removalBlocker(slots: Slots, category: SlotCategory): string | null {
  for (const other of Object.keys(REQUIRES) as SlotCategory[]) {
    const dependent = slots[other];
    if (dependent && REQUIRES[other].includes(category)) {
      return `Remove the ${CATEGORY_LABEL[other].toLowerCase()} first.`;
    }
  }
  return null;
}

export interface PowerCheck {
  ready: boolean;
  /** Short reasons the machine would not start, empty when ready. */
  reasons: string[];
}

export function powerCheck(slots: Slots): PowerCheck {
  const reasons: string[] = [];
  const needed: SlotCategory[] = ['motherboard', 'cpu', 'cooler', 'ram', 'storage', 'psu'];
  for (const category of needed) {
    if (!slots[category]) reasons.push(`No ${CATEGORY_LABEL[category].toLowerCase()}`);
  }
  if (slots.cpu && !slots.cpu.igpu && !slots.gpu) {
    reasons.push('This processor has no integrated graphics, so it needs a graphics card.');
  }
  for (const issue of evaluate(slots)) {
    if (issue.level === 'block' || issue.stopsBoot) reasons.push(issue.message);
  }
  return { ready: reasons.length === 0, reasons };
}
