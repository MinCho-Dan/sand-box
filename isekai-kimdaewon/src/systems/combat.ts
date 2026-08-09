import { sfx } from "../audio";
import { COL, TS } from "../config";
import { burst, popText } from "../core/fx";
import { down, input, touch } from "../core/inputState";
import { moveEnt, solid } from "../core/map";
import { curWeapon, state, stat, toast } from "../core/state";
import type { Enemy } from "../types";
import { angDiff, dist } from "../core/util";

export function damageEnemy(e: Enemy, dmg: number, dir: number): void {
  e.hp -= dmg;
  e.hit = 0.12;
  sfx("hit");
  burst(state, e.x, e.y, 6, "#ffe8b0", 150, 0.3);
  popText(state, e.x, e.y - e.r - 4, String(dmg), "#ffffff", 14, 0.7);
  moveEnt(e, Math.cos(dir) * 12, Math.sin(dir) * 12, state.map);
  state.shake = Math.max(state.shake, 3);
}

export function hurtPlayer(dmg: number, silent = false): void {
  const p = state.player;
  if (!silent && p.inv > 0) return;
  p.hp -= dmg;
  if (silent) return;
  p.inv = 0.55;
  p.hurtT = 0.25;
  state.shake = 10;
  state.flash = 0.5;
  sfx("hurt");
  popText(state, p.x, p.y - 26, "-" + Math.round(dmg), COL.danger, 18, 0.9);
  burst(state, p.x, p.y, 10, COL.danger, 150, 0.4);
}

/** 이동 · 회피 · 공격. 반환값은 이번 프레임의 입력 크기(회피 판정용) */
export function updatePlayer(dt: number): void {
  const p = state.player;
  const g = state.map;

  let ix = (down("KeyD", "ArrowRight") ? 1 : 0) - (down("KeyA", "ArrowLeft") ? 1 : 0);
  let iy = (down("KeyS", "ArrowDown") ? 1 : 0) - (down("KeyW", "ArrowUp") ? 1 : 0);
  if (touch.active && (touch.x || touch.y)) {
    ix = touch.x;
    iy = touch.y;
  }
  let len = Math.hypot(ix, iy);
  if (len > 0) p.face = Math.atan2(iy, ix);
  if (len > 1) {
    ix /= len;
    iy /= len;
    len = 1;
  }

  p.atkCd = Math.max(0, p.atkCd - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.swing = Math.max(0, p.swing - dt);
  p.inv = Math.max(0, p.inv - dt);
  p.hurtT = Math.max(0, p.hurtT - dt);
  state.runTime += dt;

  if ((down("KeyK", "ShiftLeft", "ShiftRight") || touch.dash) && p.dashCd <= 0 && p.dashT <= 0 && len > 0.15) {
    p.dashT = 0.18;
    p.dashCd = stat.dashCd();
    p.inv = Math.max(p.inv, stat.dashInv());
    const dn = Math.hypot(ix, iy) || 1;
    p.dvx = (ix / dn) * 520;
    p.dvy = (iy / dn) * 520;
    burst(state, p.x, p.y, 8, COL.heroDk, 90, 0.3);
    p.hunger = Math.max(0, p.hunger - stat.dashFood()); // 회피 남발에 대가를 매긴다
    sfx("dash");
  }

  if (p.dashT > 0) {
    p.dashT -= dt;
    moveEnt(p, p.dvx * dt, p.dvy * dt, g);
  } else {
    moveEnt(p, ix * 178 * dt, iy * 178 * dt, g);
  }

  attack();

  p.hunger -= dt * stat.foodRate();
  if (p.hunger <= 0) {
    p.hunger = 0;
    hurtPlayer(dt * 5, true);
  }
}

/** 공격 — 사거리 안에 적이 있으면 그쪽으로 자동 조준 */
function attack(): void {
  const p = state.player;
  if (!input.attackEdge || p.atkCd > 0) {
    input.attackEdge = false;
    return;
  }
  input.attackEdge = false;

  const wp = curWeapon();
  const REACH = stat.reach();
  const ARC = stat.arc();
  p.atkCd = stat.atkCd();
  p.swing = 0.18;
  sfx(state.tool ? "tool" : "swing");

  if (wp.drain > 0) {
    state.battery = Math.max(0, state.battery - wp.drain);
    if (state.battery <= 0) {
      // 방전 — 렌치로 자동 복귀
      state.tool = null;
      toast("배터리 방전 — 파이프 렌치");
      popText(state, p.x, p.y - 30, "방전", "#ff8a3d", 15, 1);
      sfx("empty");
    }
  }

  let aim = p.face;
  let bestD = Infinity;
  for (const e of state.enemies) {
    const d = dist(p, e);
    if (d < (REACH + e.r) * 1.4 && d < bestD) {
      bestD = d;
      aim = Math.atan2(e.y - p.y, e.x - p.x);
    }
  }
  p.face = aim;

  const dmg = stat.dmg();
  for (const e of state.enemies) {
    const d = dist(p, e);
    if (d < REACH + e.r && Math.abs(angDiff(Math.atan2(e.y - p.y, e.x - p.x), aim)) < ARC) {
      damageEnemy(e, dmg, aim);
    }
  }
  // 탄막 쳐내기
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    if (dist(p, b) < REACH + 4 && Math.abs(angDiff(Math.atan2(b.y - p.y, b.x - p.x), aim)) < ARC) {
      burst(state, b.x, b.y, 5, "#fff", 120, 0.25);
      popText(state, b.x, b.y, "쳐냄", "#dff3ff", 11, 0.6);
      sfx("parry");
      state.bullets.splice(i, 1);
    }
  }
}

export function updateBullets(dt: number): void {
  const p = state.player;
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || solid(state.map, Math.floor(b.x / TS), Math.floor(b.y / TS))) {
      burst(state, b.x, b.y, 5, "#c9a3ff", 80, 0.25);
      state.bullets.splice(i, 1);
      continue;
    }
    if (dist(p, b) < p.r + b.r) {
      if (p.inv > 0) popText(state, p.x, p.y - 22, "회피!", COL.hero, 14, 0.7);
      else hurtPlayer(b.dmg);
      burst(state, b.x, b.y, 7, p.inv > 0 ? COL.hero : COL.danger, 120, 0.3);
      state.bullets.splice(i, 1);
    }
  }
}
