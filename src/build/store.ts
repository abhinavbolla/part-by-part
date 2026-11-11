// Build state: an ordered list of steps (parts seated, cables plugged) plus a
// cursor, so undo, redo and scrubbing are all the same operation. No DOM, no 3D.

import type { CablePart, CasePart, Step } from '../catalog/types.ts';
import {
  cablesAttachedTo,
  cablesFor,
  checkAdd,
  isBlocked,
  removalBlocker,
  slotsFrom,
  storageMounts,
  type Issue,
  type Slots,
  type StorageMount,
} from '../rules/compat.ts';

export type ChangeKind = 'install' | 'remove' | 'cursor' | 'case' | 'reset';

export interface Change {
  kind: ChangeKind;
  /** Index the change happened at (install/remove). */
  index?: number;
  step?: Step;
}

/** What is written to the browser's storage. */
export interface SavedBuild {
  v: 2;
  case: CasePart;
  steps: Step[];
  cursor: number;
}

type Listener = (change: Change) => void;

export class BuildStore {
  pcCase: CasePart;
  /** Every step, including ones undone and still redoable. */
  steps: Step[] = [];
  /** Steps before the cursor are in place. */
  cursor = 0;
  /** The M.2 slot or bay each drive was given when it went in. */
  mounts = new Map<string, StorageMount>();
  private listeners = new Set<Listener>();

  constructor(pcCase: CasePart) {
    this.pcCase = pcCase;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(change: Change): void {
    for (const listener of this.listeners) listener(change);
  }

  get installed(): Step[] {
    return this.steps.slice(0, this.cursor);
  }

  get slots(): Slots {
    return slotsFrom(this.pcCase, this.installed, this.mounts);
  }

  isInstalled(id: string): boolean {
    return this.installed.some((step) => step.id === id);
  }

  /** The cables this build needs, each marked with whether it is plugged in. */
  wiring(): { cable: CablePart; plugged: boolean }[] {
    const slots = this.slots;
    const plugged = new Set(slots.cables.map((cable) => cable.id));
    return cablesFor(slots).map((cable) => ({ cable, plugged: plugged.has(cable.id) }));
  }

  check(step: Step): Issue[] {
    return checkAdd(this.slots, step);
  }

  /** Puts the step in and returns its warnings, or returns the blocking issues and changes nothing. */
  install(step: Step): { ok: boolean; issues: Issue[] } {
    if (this.isInstalled(step.id)) return { ok: false, issues: [] };
    const issues = this.check(step);
    if (isBlocked(issues)) return { ok: false, issues };
    this.truncate();
    this.steps.push(step);
    this.cursor = this.steps.length;
    if (step.category === 'storage') {
      const mount = storageMounts(this.slots).get(step.id);
      if (mount) this.mounts.set(step.id, mount);
    }
    this.emit({ kind: 'install', index: this.cursor - 1, step });
    return { ok: true, issues };
  }

  /** Drops steps that were undone and can no longer be redone. */
  private truncate(): void {
    for (const step of this.steps.slice(this.cursor)) this.mounts.delete(step.id);
    this.steps.length = this.cursor;
  }

  removalBlocker(id: string): string | null {
    const step = this.installed.find((candidate) => candidate.id === id);
    if (!step) return 'Not installed.';
    return removalBlocker(this.slots, step);
  }

  /** Takes a step out, unplugging any cables attached to it first. */
  remove(id: string): { ok: boolean; reason?: string } {
    const reason = this.removalBlocker(id);
    if (reason) return { ok: false, reason };
    this.truncate();
    const step = this.steps.find((candidate) => candidate.id === id)!;
    for (const item of [...cablesAttachedTo(this.slots, step), step]) {
      const index = this.steps.findIndex((candidate) => candidate.id === item.id);
      if (index < 0) continue;
      this.steps.splice(index, 1);
      this.cursor = this.steps.length;
      this.mounts.delete(item.id);
      this.emit({ kind: 'remove', index, step: item });
    }
    return { ok: true };
  }

  setCursor(cursor: number): void {
    const next = Math.max(0, Math.min(this.steps.length, Math.round(cursor)));
    if (next === this.cursor) return;
    this.cursor = next;
    this.emit({ kind: 'cursor' });
  }

  undo(): void {
    this.setCursor(this.cursor - 1);
  }

  redo(): void {
    this.setCursor(this.cursor + 1);
  }

  /** Swaps the case. Only an empty case can be swapped. */
  setCase(pcCase: CasePart): { ok: boolean; reason?: string } {
    if (pcCase.id === this.pcCase.id) return { ok: true };
    if (this.cursor > 0) return { ok: false, reason: 'Empty the case before changing it.' };
    this.steps = [];
    this.mounts.clear();
    this.pcCase = pcCase;
    this.emit({ kind: 'case' });
    return { ok: true };
  }

  /** Empties the case. */
  clear(): void {
    this.steps = [];
    this.mounts.clear();
    this.cursor = 0;
    this.emit({ kind: 'reset' });
  }

  save(): SavedBuild {
    return { v: 2, case: this.pcCase, steps: this.steps, cursor: this.cursor };
  }

  /** Loads a saved build, replaying it through the rules so stale data cannot seat a misfit. */
  restore(saved: unknown): boolean {
    const data = saved as Partial<SavedBuild> | null;
    if (!data || data.v !== 2 || !data.case?.dims || !Array.isArray(data.steps)) return false;
    this.pcCase = data.case;
    this.steps = [];
    this.mounts.clear();
    this.cursor = 0;
    for (const step of data.steps) {
      if (!step || typeof step.id !== 'string') continue;
      if (this.steps.some((seen) => seen.id === step.id)) continue;
      const issues = checkAdd(this.slots, step);
      if (isBlocked(issues)) continue;
      this.steps.push(step);
      this.cursor = this.steps.length;
      if (step.category === 'storage') {
        const mount = storageMounts(this.slots).get(step.id);
        if (mount) this.mounts.set(step.id, mount);
      }
    }
    this.cursor = Math.max(0, Math.min(this.steps.length, Number(data.cursor) || 0));
    this.emit({ kind: 'reset' });
    return true;
  }
}
