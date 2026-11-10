// Build state: an ordered list of seated parts plus a cursor, so undo, redo
// and scrubbing are all the same operation. No DOM, no 3D.

import type { CasePart, Part } from '../catalog/types.ts';
import {
  checkAdd,
  isBlocked,
  removalBlocker,
  slotsFrom,
  type Issue,
  type Slots,
} from '../rules/compat.ts';

export type ChangeKind = 'install' | 'remove' | 'cursor';

export interface Change {
  kind: ChangeKind;
  /** Index the change happened at (install/remove). */
  index?: number;
  part?: Part;
}

type Listener = (change: Change) => void;

export class BuildStore {
  readonly pcCase: CasePart;
  /** Every step, including ones undone and still redoable. */
  steps: Part[] = [];
  /** Steps before the cursor are seated. */
  cursor = 0;
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

  get installed(): Part[] {
    return this.steps.slice(0, this.cursor);
  }

  get slots(): Slots {
    return slotsFrom(this.pcCase, this.installed);
  }

  isInstalled(id: string): boolean {
    return this.installed.some((part) => part.id === id);
  }

  check(part: Part): Issue[] {
    return checkAdd(this.slots, part);
  }

  /** Seats the part and returns its warnings, or returns the blocking issues and changes nothing. */
  install(part: Part): { ok: boolean; issues: Issue[] } {
    const issues = this.check(part);
    if (isBlocked(issues)) return { ok: false, issues };
    this.steps.length = this.cursor; // a new step discards the redo tail
    this.steps.push(part);
    this.cursor = this.steps.length;
    this.emit({ kind: 'install', index: this.cursor - 1, part });
    return { ok: true, issues };
  }

  removalBlocker(id: string): string | null {
    const part = this.installed.find((candidate) => candidate.id === id);
    if (!part) return 'Not installed.';
    return removalBlocker(this.slots, part.category);
  }

  remove(id: string): { ok: boolean; reason?: string } {
    const reason = this.removalBlocker(id);
    if (reason) return { ok: false, reason };
    this.steps.length = this.cursor;
    const index = this.steps.findIndex((part) => part.id === id);
    const [part] = this.steps.splice(index, 1);
    this.cursor = this.steps.length;
    this.emit({ kind: 'remove', index, part });
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
}
