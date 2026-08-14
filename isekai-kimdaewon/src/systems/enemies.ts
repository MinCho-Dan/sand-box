import { sfx } from "../audio";
import { BATT_DROP, TOOL_IDS } from "../data/weapons";
import { TOOL_DROP_FROM } from "../data/chapters";
import { ENEMY_DEF } from "../data/enemies";
import { burst, popText } from "../core/fx";
import { moveEnt } from "../core/map";
import { makeEnemy, setScene, state } from "../core/state";
import { dist, rnd } from "../core/util";
import { hurtPlayer } from "./combat";

export function updateEnemies(dt: number): void {
  const p = state.player;
  const g = state.map;

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    const d = ENEMY_DEF[e.type];
    e.hit = Math.max(0, e.hit - dt);
    e.touch = Math.max(0, e.touch - dt);
    e.wob += dt;

    const toP = Math.atan2(p.y - e.y, p.x - e.x);
    const dp = dist(p, e);

    if (d.boss) {
      const hpR = e.hp / e.maxhp;

      if (e.mode === 1) {
        // 돌진 예고 — 조준 고정, 제자리 대기 (charger 와 같은 언어)
        e.windT -= dt;
        if (e.windT <= 0) {
          e.mode = 2;
          e.rushT = 0.5;
          sfx("charge");
        }
      } else if (e.mode === 2) {
        const bx = e.x;
        const by = e.y;
        const rush = d.rush ?? 520;
        moveEnt(e, Math.cos(e.aim) * rush * dt, Math.sin(e.aim) * rush * dt, g);
        e.rushT -= dt;
        const hitWall = Math.hypot(e.x - bx, e.y - by) < rush * dt * 0.5;
        if (e.rushT <= 0 || hitWall) {
          e.mode = 0;
          e.cd = 1.6;
          if (hitWall) {
            burst(state, e.x, e.y, 14, d.color, 200, 0.5);
            state.shake = Math.max(state.shake, 10);
          }
        }
      } else {
        e.cd -= dt;
        const keep = hpR < 0.5 ? 160 : 205;
        const mv = dp > keep ? 1 : -0.5;
        moveEnt(e, Math.cos(toP) * e.spd * mv * dt, Math.sin(toP) * e.spd * mv * dt, g);
        if (e.cd <= 0) {
          e.phase = (e.phase + 1) % 4;
          if (e.phase === 2) {
            for (let k = 0; k < (hpR < 0.5 ? 3 : 2); k++) {
              const a = rnd(0, Math.PI * 2);
              state.enemies.push(makeEnemy("spore", e.x + Math.cos(a) * 46, e.y + Math.sin(a) * 46));
            }
            burst(state, e.x, e.y, 20, "#b06cff", 200, 0.5);
            e.cd = 3.4;
          } else if (e.phase === 3 && hpR < 0.5) {
            // 체력 절반 아래에서만 풀리는 돌진 — 조준선을 보고 옆으로 피할 수 있다
            e.mode = 1;
            e.windT = 0.42;
            e.aim = toP;
          } else {
            const n = hpR < 0.5 ? 13 : 10;
            const off = rnd(0, Math.PI * 2);
            for (let k = 0; k < n; k++) {
              const a = off + (k / n) * Math.PI * 2;
              state.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, r: 6, dmg: 11, life: 5 });
            }
            state.shake = 8;
            e.cd = hpR < 0.5 ? 1.7 : 2.3;
          }
        }
      }
    } else if (d.ranged) {
      e.cd -= dt;
      const keep = 150;
      const mv = dp > keep + 30 ? 1 : dp < keep - 40 ? -1 : 0;
      moveEnt(e, Math.cos(toP) * e.spd * mv * dt, Math.sin(toP) * e.spd * mv * dt, g);
      if (e.cd <= 0 && dp < 380) {
        e.cd = 2.6;
        for (let k = -1; k <= 1; k++) {
          const a = toP + k * 0.15;
          state.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, r: 5, dmg: d.dmg, life: 4 });
        }
      }
    } else if (d.charge) {
      // 0: 접근 → 1: 조준선 노출(예고) → 2: 직선 돌진
      e.cd = Math.max(0, e.cd - dt);
      if (e.mode === 2) {
        e.rushT -= dt;
        const bx = e.x;
        const by = e.y;
        const rush = d.rush ?? 400;
        moveEnt(e, Math.cos(e.aim) * rush * dt, Math.sin(e.aim) * rush * dt, g);
        const hitWall = Math.hypot(e.x - bx, e.y - by) < rush * dt * 0.5;
        if (e.rushT <= 0 || hitWall) {
          e.mode = 0;
          e.cd = 1.3;
          if (hitWall) {
            burst(state, e.x, e.y, 10, d.color, 160, 0.4);
            state.shake = Math.max(state.shake, 6);
          }
        }
      } else if (e.mode === 1) {
        e.windT -= dt; // 예고 중에는 조준을 갱신하지 않는다 — 옆으로 피할 수 있게
        if (e.windT <= 0) {
          e.mode = 2;
          e.rushT = 0.45;
        }
      } else {
        moveEnt(e, Math.cos(toP) * e.spd * dt, Math.sin(toP) * e.spd * dt, g);
        if (dp < 250 && e.cd <= 0) {
          e.mode = 1;
          e.windT = 0.7;
          e.aim = toP;
          sfx("charge");
        }
      }
    } else {
      const a = toP + (e.type === "spore" ? Math.sin(e.wob * 6) * 0.5 : 0);
      moveEnt(e, Math.cos(a) * e.spd * dt, Math.sin(a) * e.spd * dt, g);
    }

    // 접촉 피해
    if (dp < p.r + e.r && e.touch <= 0) {
      e.touch = 0.7;
      hurtPlayer(d.dmg);
      const kb = Math.atan2(p.y - e.y, p.x - e.x);
      moveEnt(p, Math.cos(kb) * 18, Math.sin(kb) * 18, g);
    }

    if (e.hp <= 0) {
      state.enemies.splice(i, 1);
      state.kills++;
      state.score += d.score;
      state.sc.kills += d.score;
      burst(state, e.x, e.y, d.boss ? 60 : 16, d.color, d.boss ? 320 : 190, d.boss ? 1.1 : 0.5);
      state.shake = d.boss ? 24 : 5;
      sfx(d.boss ? "boss" : "kill");
      state.items.push({ x: e.x, y: e.y, r: 9, type: "gem", val: d.gem, t: 0 });

      if (d.split) {
        for (let k = 0; k < d.split; k++) {
          const a = rnd(0, Math.PI * 2);
          state.enemies.push(makeEnemy("spore", e.x + Math.cos(a) * 26, e.y + Math.sin(a) * 26));
        }
        popText(state, e.x, e.y - 24, "분열!", "#9ef07a", 14, 0.8);
      }

      if (!d.boss) {
        // food+medkit 폭을 좁혔다 — 허기가 사실상 무료였다는 피드백에 맞춰
        // 회복 수급도 같이 조여야 자원 압박이 실제로 느껴진다
        const roll = Math.random();
        if (roll < 0.12) state.items.push({ x: e.x + 14, y: e.y, r: 10, type: "food", t: 0 });
        else if (roll < 0.18) state.items.push({ x: e.x + 14, y: e.y, r: 10, type: "medkit", t: 0 });
        else if (roll < 0.4) state.items.push({ x: e.x + 14, y: e.y, r: 10, type: "batt", val: BATT_DROP, t: 0 });
        else if (roll < 0.45 && state.chapterIdx >= TOOL_DROP_FROM)
          state.items.push({
            x: e.x + 14, y: e.y, r: 12, type: "tool",
            tool: TOOL_IDS[Math.floor(Math.random() * TOOL_IDS.length)], t: 0,
          });
      } else {
        state.flash = 1;
        setScene("bossdown", 99); // 연출 동안 입력 차단
        return;
      }
    }
  }
}
