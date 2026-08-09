import type { Vec } from "../types";

export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

/** 두 각도의 최소 차이(-PI..PI) */
export function angDiff(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
