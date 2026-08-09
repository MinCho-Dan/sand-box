import type { GameState } from "../types";
import { rnd } from "./util";

export function burst(s: GameState, x: number, y: number, n: number, color: string, spd = 160, life = 0.45): void {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2);
    const v = rnd(spd * 0.3, spd);
    s.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, color, sz: rnd(1.5, 3.5) });
  }
}

export function popText(s: GameState, x: number, y: number, text: string, color: string, size = 13, life = 0.8): void {
  s.parts.push({ x: x + rnd(-8, 8), y, vx: rnd(-12, 12), vy: -40, life, max: life, color, text, size });
}

export function stepParticles(s: GameState, dt: number): void {
  for (let i = s.parts.length - 1; i >= 0; i--) {
    const q = s.parts[i];
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vx *= 0.93;
    q.vy *= 0.93;
    q.life -= dt;
    if (q.life <= 0) s.parts.splice(i, 1);
  }
}
