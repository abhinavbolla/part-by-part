import type { Group, MeshStandardMaterial, Object3D } from 'three';

/** Moving bits of the motherboard that other parts operate as they go in. */
export interface Fixtures {
  /** 0 closed .. 1 open: the CPU retention frame and its lever. */
  socket(open: number): void;
  /** 0 latched .. 1 open: the DIMM clips. */
  dimm(open: number): void;
  /** 0 latched .. 1 open: the graphics slot latch. */
  latch(open: number): void;
  /** 0 shut .. 1 swung up: the heatsink over M.2 socket `slot`, if it has one. */
  m2(slot: number, open: number): void;
}

export interface PartModel {
  group: Group;
  /** Which frame the group lives in. */
  frame: 'case' | 'board';
  /** Seconds for a full installation, p from 0 to 1. */
  duration: number;
  /** Pose the part for progress p. With `drive` false, board fixtures are left alone. */
  setProgress(p: number, drive: boolean): void;
  /** Things that spin when the machine is on. */
  rotors: Object3D[];
  /** Materials that light when the machine is on. */
  glow: MeshStandardMaterial[];
  /** Sub-objects to outline as drop targets; defaults to the whole group. */
  ghostTargets?: Object3D[];
  /** How to turn the part for its own picture, when its best side faces away in the case. */
  portrait?: [number, number, number];
}
