// Easing and timeline helpers. A part's whole installation is one number,
// p in [0, 1]: 0 is "not there", HOVER is "held above its slot", 1 is seated.
// Every pose is a pure function of p, which is what makes undo, replay and
// scrubbing work without extra state.

import type { Object3D } from 'three';

export const HOVER = 0.35;

export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Progress of p through the window [a, b], clamped to 0..1. */
export const seg = (p: number, a: number, b: number): number => clamp01((p - a) / (b - a));

export const easeInOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);
/** Accelerates into the stop, so a part lands like it was pushed home. */
export const easeIn = (t: number): number => t * t;
/** Slow start, then a firm push at the end. */
export const push = (t: number): number => (t < 0.6 ? 0.45 * easeInOut(t / 0.6) : 0.45 + 0.55 * easeIn((t - 0.6) / 0.4));

export interface Travel {
  /** Seated position in the parent frame. */
  seat: [number, number, number];
  /** Offset from seat while held above the slot. */
  hover: [number, number, number];
  /** Further offset at p = 0, where the part enters from. */
  enter: [number, number, number];
}

/**
 * Places `group` for progress p: enter -> hover over [0, HOVER], then
 * hover -> seat over [seatStart, seatEnd] with the given easing.
 */
export function travel(
  group: Object3D,
  p: number,
  t: Travel,
  seatStart: number,
  seatEnd: number,
  ease: (t: number) => number = push,
): void {
  const a = 1 - easeOut(seg(p, 0, HOVER));
  const b = 1 - ease(seg(p, seatStart, seatEnd));
  group.position.set(
    t.seat[0] + t.hover[0] * b + t.enter[0] * a,
    t.seat[1] + t.hover[1] * b + t.enter[1] * a,
    t.seat[2] + t.hover[2] * b + t.enter[2] * a,
  );
}

/** A screw that drops in along z and spins home over the window [a, b] of p. */
export function driveScrew(screw: Object3D, p: number, a: number, b: number, seatZ: number): void {
  const t = seg(p, a, b);
  screw.visible = t > 0;
  const k = 1 - easeOut(t);
  screw.position.z = seatZ + k * 26;
  screw.rotation.z = k * 14;
}
