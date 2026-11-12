// Compatibility rules. Pure functions over catalog data: no DOM, no 3D.
// "block" means the part physically will not go in; "warn" means it fits but
// the build is unwise or will not run.

import type {
  CablePart,
  CasePart,
  CoolerPart,
  CpuPart,
  GpuPart,
  MotherboardPart,
  Part,
  PsuPart,
  RamPart,
  SlotCategory,
  Step,
  StoragePart,
} from '../catalog/types.ts';
import { CATEGORY_LABEL, isCable } from '../catalog/types.ts';

export interface Slots {
  case: CasePart;
  motherboard?: MotherboardPart;
  cpu?: CpuPart;
  cooler?: CoolerPart;
  ram?: RamPart;
  gpu?: GpuPart;
  psu?: PsuPart;
  /** Drives, in the order they went in. */
  storage: StoragePart[];
  /** Cables that are plugged in. */
  cables: CablePart[];
  /** Mounts already given to drives, so they stay put when another drive leaves. */
  fixed?: Map<string, StorageMount>;
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

/** Watts for the board, memory, drives and fans. */
const BASE_LOAD = 60;
/** Depth of a 25 mm fan, for radiators mounted behind the front panel. */
const FAN_DEPTH = 25;
/** 2.5-inch drives are mounted on the shroud, which has room for two. */
const MAX_DRAWN_BAYS = 2;

export function slotsFrom(pcCase: CasePart, steps: Step[], fixed?: Map<string, StorageMount>): Slots {
  const slots: Slots = { case: pcCase, storage: [], cables: [], fixed };
  for (const step of steps) setSlot(slots, step);
  return slots;
}

function setSlot(slots: Slots, step: Step): void {
  switch (step.category) {
    case 'motherboard': slots.motherboard = step; break;
    case 'cpu': slots.cpu = step; break;
    case 'cooler': slots.cooler = step; break;
    case 'ram': slots.ram = step; break;
    case 'gpu': slots.gpu = step; break;
    case 'psu': slots.psu = step; break;
    case 'storage': slots.storage = [...slots.storage, step]; break;
    case 'cable': slots.cables = [...slots.cables, step]; break;
  }
}

/** The part seated in a single-occupant slot, if any. */
function occupant(slots: Slots, category: SlotCategory): Part | undefined {
  if (category === 'storage') return undefined;
  return slots[category];
}

export function estimatedLoad(slots: Slots): number {
  if (!slots.motherboard) return 0;
  return BASE_LOAD + (slots.cpu?.peakPower ?? 0) + (slots.gpu?.power ?? 0);
}

// ---- where things mount -------------------------------------------------------

export type StorageMount = { kind: 'm2'; index: number } | { kind: 'bay'; index: number };

/** Which M.2 slot or drive bay each drive occupies, in installation order. */
export function storageMounts(slots: Slots): Map<string, StorageMount | null> {
  const mounts = new Map<string, StorageMount | null>();
  const usedM2 = new Set<number>();
  const usedBays = new Set<number>();
  for (const drive of slots.storage) {
    const kept = slots.fixed?.get(drive.id);
    if (!kept) continue;
    mounts.set(drive.id, kept);
    (kept.kind === 'm2' ? usedM2 : usedBays).add(kept.index);
  }
  const bays = Math.min(MAX_DRAWN_BAYS, slots.case.bays.ssd25 + slots.case.bays.hdd35);
  for (const drive of slots.storage) {
    if (mounts.has(drive.id)) continue;
    if (drive.formFactor === 'M.2') {
      const index = (slots.motherboard?.m2Slots ?? []).findIndex(
        (slot, i) => !usedM2.has(i) && slot.interfaces.includes(drive.interface) && drive.length <= slot.maxLength,
      );
      if (index >= 0) usedM2.add(index);
      mounts.set(drive.id, index >= 0 ? { kind: 'm2', index } : null);
    } else {
      let index = 0;
      while (usedBays.has(index)) index++;
      if (index < bays) usedBays.add(index);
      mounts.set(drive.id, index < bays ? { kind: 'bay', index } : null);
    }
  }
  return mounts;
}

/** Where a liquid cooler's radiator goes in this case, or null if nowhere. */
export function radiatorMount(pcCase: CasePart, cooler: CoolerPart): 'top' | 'front' | null {
  if (cooler.kind !== 'aio') return null;
  if (pcCase.radiators.top.includes(cooler.radiator.size)) return 'top';
  if (pcCase.radiators.front.includes(cooler.radiator.size)) return 'front';
  return null;
}

/** Room for a graphics card, less a front-mounted radiator and its fans. */
export function gpuClearance(slots: Slots): number {
  const { case: pcCase, cooler } = slots;
  if (cooler?.kind === 'aio' && radiatorMount(pcCase, cooler) === 'front') {
    return pcCase.maxGpuLength - cooler.radiator.thickness - FAN_DEPTH;
  }
  return pcCase.maxGpuLength;
}

// ---- cables -------------------------------------------------------------------

const plugList = (gpu: GpuPart): string => {
  const plugs: string[] = [];
  if (gpu.connectors.hpwr16) plugs.push(`${gpu.connectors.hpwr16 > 1 ? gpu.connectors.hpwr16 + ' × ' : ''}16-pin`);
  if (gpu.connectors.pcie8) plugs.push(`${gpu.connectors.pcie8 > 1 ? gpu.connectors.pcie8 + ' × ' : ''}8-pin PCIe`);
  return plugs.join(' and ');
};

/** Every cable this build needs, whether or not it is plugged in yet. */
export function cablesFor(slots: Slots): CablePart[] {
  const { motherboard: board, psu, gpu, cooler } = slots;
  const out: CablePart[] = [];
  if (board && psu) {
    out.push({
      id: 'cable-atx24', category: 'cable', kind: 'atx24', name: '24-pin power',
      detail: 'Power supply to motherboard', target: board.id, required: true,
    });
    out.push({
      id: 'cable-eps', category: 'cable', kind: 'eps', name: 'CPU power',
      detail: '8-pin, power supply to the top of the board', target: board.id, required: true,
    });
  }
  if (psu && gpu && gpu.connectors.pcie8 + gpu.connectors.hpwr16 > 0) {
    out.push({
      id: 'cable-gpu', category: 'cable', kind: 'gpu', name: 'Graphics power',
      detail: `${plugList(gpu)}, power supply to the card`, target: gpu.id, required: true,
    });
  }
  if (board && cooler) {
    out.push({
      id: 'cable-cooler', category: 'cable', kind: 'cooler',
      name: cooler.kind === 'aio' ? 'Pump and fans' : 'CPU fan',
      detail: 'Cooler to the fan header', target: cooler.id, required: true,
    });
  }
  if (board && psu) {
    for (const drive of slots.storage) {
      if (drive.formFactor !== '2.5"') continue;
      out.push({
        id: `cable-sata-${drive.id}`, category: 'cable', kind: 'sata', name: 'SATA data and power',
        detail: `${drive.name} to the board and power supply`, target: drive.id, required: true,
      });
    }
  }
  if (board) {
    out.push({
      id: 'cable-front', category: 'cable', kind: 'front', name: 'Front panel',
      detail: 'Power button and case fans to the board', target: board.id, required: true,
    });
  }
  return out;
}

// ---- the rules ------------------------------------------------------------------

/** Every rule that applies to the parts present, in a stable order. */
export function evaluate(slots: Slots): Issue[] {
  const out: Issue[] = [];
  const { case: pcCase, motherboard: board, cpu, cooler, ram, gpu, psu } = slots;

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

  if (cooler) {
    if (board && !cooler.sockets.includes(board.socket)) {
      out.push({
        level: 'block',
        code: 'cooler-socket',
        message: `${cooler.name} has no mounting kit for ${board.socket}.`,
        parts: [cooler.id, board.id],
      });
    }
    if (cooler.kind === 'air' && cooler.height > pcCase.maxCoolerHeight) {
      out.push({
        level: 'block',
        code: 'cooler-height',
        message: `${cooler.name} is ${cooler.height} mm tall; the ${pcCase.name} clears ${pcCase.maxCoolerHeight} mm.`,
        parts: [cooler.id],
      });
    }
    if (cooler.kind === 'aio' && !radiatorMount(pcCase, cooler)) {
      out.push({
        level: 'block',
        code: 'radiator-mount',
        message: `The ${pcCase.name} has no mount for a ${cooler.radiator.size} mm radiator.`,
        parts: [cooler.id],
      });
    }
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

  const mounts = storageMounts(slots);
  let sataDrives = 0;
  for (const drive of slots.storage) {
    if (drive.formFactor === '2.5"') sataDrives++;
    if (mounts.get(drive.id)) continue;
    if (drive.formFactor === 'M.2') {
      if (!board) continue;
      const anySlotTakesIt = board.m2Slots.some(
        (slot) => slot.interfaces.includes(drive.interface) && drive.length <= slot.maxLength,
      );
      out.push({
        level: 'block',
        code: anySlotTakesIt ? 'm2-full' : 'm2-slot',
        message: anySlotTakesIt
          ? `Every M.2 slot that takes ${drive.name} is in use.`
          : `No M.2 slot on this board takes a ${drive.length} mm ${drive.interface === 'sata' ? 'SATA' : 'NVMe'} drive.`,
        parts: [drive.id, board.id],
      });
    } else {
      out.push({
        level: 'block',
        code: 'bay-full',
        message: `The ${pcCase.name} has no free drive mount for ${drive.name}.`,
        parts: [drive.id],
      });
    }
  }
  if (board && sataDrives > board.sataPorts) {
    const last = slots.storage.filter((drive) => drive.formFactor === '2.5"').at(-1)!;
    out.push({
      level: 'warn',
      code: 'sata-ports',
      message: `${sataDrives} SATA drives, but the board has ${board.sataPorts} SATA ports.`,
      parts: [last.id, board.id],
      stopsBoot: true,
    });
  }

  if (gpu) {
    const room = gpuClearance(slots);
    if (gpu.length > room) {
      const squeezed = room < pcCase.maxGpuLength;
      out.push({
        level: 'block',
        code: 'gpu-length',
        message: squeezed
          ? `${gpu.name} is ${gpu.length} mm long; with the radiator in front there is room for ${room} mm.`
          : `${gpu.name} is ${gpu.length} mm long; the ${pcCase.name} has room for ${room} mm.`,
        parts: [gpu.id, ...(squeezed && cooler ? [cooler.id] : [])],
      });
    }
    // The card sits in the second slot position (the first on Mini-ITX) and grows downward.
    const below = pcCase.expansionSlots - (board?.formFactor === 'Mini-ITX' ? 0 : 1);
    if (Math.ceil(gpu.slots) > below) {
      out.push({
        level: 'block',
        code: 'gpu-slots',
        message: `${gpu.name} covers ${Math.ceil(gpu.slots)} slots; the case has ${below} from that position down.`,
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
    if (sataDrives > 0 && psu.connectors.sata < sataDrives) {
      out.push({
        level: 'warn',
        code: 'psu-sata',
        message: `${sataDrives} SATA drives, but ${psu.name} has ${psu.connectors.sata} SATA power plugs.`,
        parts: [psu.id],
        stopsBoot: true,
      });
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

/** What must already be seated before this step can go in. */
function requirement(step: Step): SlotCategory | null {
  switch (step.category) {
    case 'cpu':
    case 'ram':
    case 'gpu':
      return 'motherboard';
    case 'cooler':
      return 'cpu';
    case 'storage':
      return step.formFactor === 'M.2' ? 'motherboard' : null;
    default:
      return null;
  }
}

function checkCable(slots: Slots, cable: CablePart): Issue[] {
  const wanted = cablesFor(slots).find((item) => item.id === cable.id);
  if (!wanted) {
    return [{
      level: 'block',
      code: 'cable-ends',
      message: 'Both ends of this cable need to be in the case first.',
      parts: [cable.id],
    }];
  }
  if (slots.cables.some((item) => item.id === cable.id)) {
    return [{ level: 'block', code: 'occupied', message: 'Already plugged in.', parts: [cable.id] }];
  }
  if (cable.kind === 'gpu' || cable.kind === 'sata') {
    const codes = cable.kind === 'gpu' ? ['psu-gpu-16pin', 'psu-gpu-8pin'] : ['psu-sata', 'sata-ports'];
    const short = evaluate(slots).find((issue) => codes.includes(issue.code));
    if (short) return [{ ...short, level: 'block', parts: [cable.id, ...short.parts] }];
  }
  return [];
}

/** Issues that adding `step` would cause. Any "block" means it cannot go in. */
export function checkAdd(slots: Slots, step: Step): Issue[] {
  if (isCable(step)) return checkCable(slots, step);

  const present = occupant(slots, step.category);
  if (present && present.id !== step.id) {
    return [{
      level: 'block',
      code: 'occupied',
      message: `${present.name} is already there. Remove it first.`,
      parts: [step.id, present.id],
    }];
  }
  const needed = requirement(step);
  if (needed && !slots[needed]) {
    return [{
      level: 'block',
      code: 'needs-' + needed,
      message: `Add a ${CATEGORY_LABEL[needed].toLowerCase()} first.`,
      parts: [step.id],
    }];
  }
  const next: Slots = { ...slots };
  setSlot(next, step);
  return evaluate(next).filter((issue) => issue.parts.includes(step.id));
}

export function isBlocked(issues: Issue[]): boolean {
  return issues.some((issue) => issue.level === 'block');
}

/** A refusal about the part itself, rather than about order or an occupied slot. */
export function isMisfit(issues: Issue[]): boolean {
  return issues.some(
    (issue) => issue.level === 'block' && issue.code !== 'occupied'
      && issue.code !== 'cable-ends' && !issue.code.startsWith('needs-'),
  );
}

/** Why a seated step cannot come out yet, or null if it can. */
export function removalBlocker(slots: Slots, step: Step): string | null {
  if (isCable(step)) return null;
  const candidates: (Part | undefined)[] = [
    slots.cpu, slots.cooler, slots.ram, slots.gpu, slots.psu, ...slots.storage,
  ];
  const seated = candidates.filter((part): part is Part => part !== undefined);
  for (const other of seated) {
    if (other.id !== step.id && requirement(other) === step.category) {
      return `Remove the ${CATEGORY_LABEL[other.category].toLowerCase()} first.`;
    }
  }
  return null;
}

/** Cables that have to be unplugged when this step comes out. */
export function cablesAttachedTo(slots: Slots, step: Step): CablePart[] {
  if (isCable(step)) return [];
  if (step.category === 'psu') {
    return slots.cables.filter((cable) => cable.kind !== 'cooler' && cable.kind !== 'front');
  }
  if (step.category === 'motherboard') return slots.cables;
  return slots.cables.filter((cable) => cable.target === step.id);
}

export interface PowerCheck {
  ready: boolean;
  /** Parts still missing. */
  missing: string[];
  /** Cables that are needed and not plugged in. */
  unplugged: string[];
  /** Other reasons the machine would not start. */
  faults: string[];
}

export function powerCheck(slots: Slots): PowerCheck {
  const missing: string[] = [];
  for (const category of ['motherboard', 'cpu', 'cooler', 'ram', 'psu'] as const) {
    if (!slots[category]) missing.push(CATEGORY_LABEL[category].toLowerCase());
  }
  if (slots.storage.length === 0) missing.push('storage');

  const plugged = new Set(slots.cables.map((cable) => cable.id));
  const unplugged = cablesFor(slots)
    .filter((cable) => cable.required && !plugged.has(cable.id))
    .map((cable) => cable.name.toLowerCase());

  const faults: string[] = [];
  if (slots.cpu && !slots.cpu.igpu && !slots.gpu) {
    faults.push(`${slots.cpu.name} has no integrated graphics, so it needs a graphics card.`);
  }
  for (const issue of evaluate(slots)) {
    if (issue.level === 'block' || issue.stopsBoot) faults.push(issue.message);
  }
  return {
    ready: missing.length + unplugged.length + faults.length === 0,
    missing,
    unplugged,
    faults,
  };
}
