import { COL, MH, MW, THEMES, TS } from "../config";
import { CHAPTERS } from "../data/chapters";
import { ENEMY_DEF } from "../data/enemies";
import { WEAPONS } from "../data/weapons";
import { curWeapon, state, stat } from "../core/state";
import type { ToolId } from "../types";
import { ctx } from "./ctx";

export function drawMap(): void {
  const g = state.map;
  const th = THEMES[CHAPTERS[state.chapterIdx].theme] ?? THEMES.mart;
  for (let y = 0; y < MH; y++) {
    for (let x = 0; x < MW; x++) {
      const px = x * TS;
      const py = y * TS;
      if (g[y][x]) {
        ctx.fillStyle = th.w;
        ctx.fillRect(px, py, TS, TS);
        ctx.fillStyle = th.wt;
        ctx.fillRect(px, py, TS, 6);
        ctx.fillStyle = "rgba(0,0,0,.25)";
        ctx.fillRect(px, py + TS - 4, TS, 4);
        continue;
      }
      ctx.fillStyle = (x + y) & 1 ? th.f1 : th.f2;
      ctx.fillRect(px, py, TS, TS);
      if (th.deco === "grass" && (x * 7 + y * 13) % 5 === 0) {
        ctx.fillStyle = "rgba(150,220,120,.15)";
        const gx = px + ((x * 11 + y * 5) % 22) + 6;
        const gy = py + ((x * 17 + y * 3) % 22) + 7;
        ctx.fillRect(gx, gy, 2, 6);
        ctx.fillRect(gx + 4, gy + 2, 2, 4);
      } else if (th.deco === "crack" && (x * 5 + y * 9) % 7 === 0) {
        ctx.fillStyle = "rgba(0,0,0,.22)";
        ctx.fillRect(px + ((x * 13) % 20) + 4, py + ((y * 7) % 20) + 6, 11, 2);
      } else if (th.deco === "ice" && (x * 3 + y * 11) % 6 === 0) {
        ctx.fillStyle = "rgba(200,235,255,.10)";
        const ix = px + ((x * 7 + y * 5) % 22) + 7;
        const iy = py + ((x * 5 + y * 13) % 22) + 7;
        ctx.fillRect(ix - 5, iy, 10, 1);
        ctx.fillRect(ix, iy - 5, 1, 10);
      }
    }
  }
}

export function drawItems(): void {
  for (const it of state.items) {
    const bob = Math.sin(it.t * 3) * 3;
    ctx.save();
    ctx.translate(it.x, it.y + bob);
    if (it.type === "gem") {
      ctx.rotate(it.t * 2);
      ctx.fillStyle = COL.gem;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(6, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.5)";
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(3, -1);
      ctx.lineTo(0, 2);
      ctx.closePath();
      ctx.fill();
    } else if (it.type === "batt") {
      ctx.fillStyle = COL.batt;
      ctx.fillRect(-6, -9, 12, 18);
      ctx.fillStyle = "#2a4a58";
      ctx.fillRect(-6, -9, 12, 4);
      ctx.fillStyle = "#dff6ff";
      ctx.fillRect(-2, -13, 4, 4);
    } else if (it.type === "tool") {
      ctx.fillStyle = WEAPONS[it.tool ?? "driver"].color;
      ctx.fillRect(-9, -6, 14, 12);
      ctx.fillStyle = "#2c3a38";
      ctx.fillRect(5, -3, 9, 6);
      ctx.fillStyle = "#dff6ff";
      ctx.fillRect(-6, -3, 3, 6);
    } else if (it.type === "medkit") {
      ctx.fillStyle = "#f2f6f3";
      ctx.fillRect(-8, -7, 16, 14);
      ctx.fillStyle = "#e05555";
      ctx.fillRect(-2, -5, 4, 10);
      ctx.fillRect(-6, -2, 12, 4);
    } else {
      ctx.fillStyle = it.type === "supply" ? COL.food : "#c9a86a";
      ctx.fillRect(-7, -8, 14, 16);
      ctx.fillStyle = "rgba(255,255,255,.35)";
      ctx.fillRect(-7, -8, 14, 3);
      ctx.fillStyle = "rgba(0,0,0,.3)";
      ctx.fillRect(-7, -1, 14, 2);
    }
    ctx.restore();

    ctx.fillStyle =
      it.type === "gem"
        ? "rgba(200,155,255,.13)"
        : it.type === "batt" || it.type === "tool"
          ? "rgba(127,224,255,.13)"
          : "rgba(255,209,102,.10)";
    ctx.beginPath();
    ctx.arc(it.x, it.y + bob, 15 + Math.sin(it.t * 3) * 2, 0, 7);
    ctx.fill();
  }
}

export function drawPortal(touchOn: boolean): void {
  const P = state.portal;
  if (!P) return;
  const t = P.t;
  const glass = state.chapterIdx === 0; // 마트에서는 '동그란 유리창'

  ctx.save();
  ctx.translate(P.x, P.y);
  for (let i = 3; i >= 0; i--) {
    ctx.globalAlpha = 0.13 + i * 0.04;
    ctx.fillStyle = glass ? "#8ce07a" : COL.rift;
    ctx.beginPath();
    ctx.arc(0, 0, P.r + i * 9 + Math.sin(t * 3 + i) * 3, 0, 7);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (glass) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, P.r, 0, 7);
    ctx.clip();
    const sky = ctx.createLinearGradient(0, -P.r, 0, P.r);
    sky.addColorStop(0, "#8fd4ff");
    sky.addColorStop(0.55, "#cdeeff");
    ctx.fillStyle = sky;
    ctx.fillRect(-P.r, -P.r, P.r * 2, P.r * 2);
    ctx.fillStyle = "#fff6c9";
    ctx.beginPath();
    ctx.arc(-P.r * 0.45, -P.r * 0.5, 5, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#4ea84c";
    ctx.beginPath();
    ctx.moveTo(-P.r, P.r * 0.1);
    for (let x = -P.r; x <= P.r; x += 4) ctx.lineTo(x, P.r * 0.1 + Math.sin(x * 0.12 + t) * 3);
    ctx.lineTo(P.r, P.r);
    ctx.lineTo(-P.r, P.r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "#dff3ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, P.r, 0, 7);
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, P.r - 4, -2.5, -1.5);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    ctx.rotate(t * 1.6);
    ctx.strokeStyle = "#e0c2ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = P.r * (i % 2 ? 0.55 : 1);
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = COL.text;
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(glass ? (touchOn ? "손을 대기" : "손을 대기") : "게이트로 들어가기", P.x, P.y + P.r + 26);
}

export function drawEnemies(): void {
  for (const e of state.enemies) {
    const d = ENEMY_DEF[e.type];

    // 돌진 예고선 — 이걸 보고 옆으로 피하는 게 공략법이다
    if (d.charge && e.mode === 1) {
      const prog = 1 - e.windT / 0.7;
      ctx.save();
      ctx.globalAlpha = 0.25 + prog * 0.5;
      ctx.strokeStyle = "#ff7a4a";
      ctx.lineWidth = 2 + prog * 3;
      ctx.setLineDash([9, 7]);
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x + Math.cos(e.aim) * 300, e.y + Math.sin(e.aim) * 300);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
    if (d.charge && e.mode === 2) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(e.x - Math.cos(e.aim) * 16, e.y - Math.sin(e.aim) * 16, e.r, 0, 7);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.save();
    ctx.translate(e.x, e.y);
    if (d.charge && e.mode === 1) {
      const f = 1 - e.windT / 0.7;
      ctx.globalAlpha = 0.35 + Math.sin(f * 30) * 0.2;
      ctx.fillStyle = "#ff7a4a";
      ctx.beginPath();
      ctx.arc(0, 0, e.r + 7, 0, 7);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (d.boss) {
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = COL.rift;
      ctx.beginPath();
      ctx.arc(0, 0, e.r + 22 + Math.sin(e.wob * 2) * 6, 0, 7);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = e.hit > 0 ? "#ffffff" : d.color;
    ctx.beginPath();
    ctx.arc(0, Math.sin(e.wob * 7) * 0.8, e.r, 0, 7);
    ctx.fill();
    ctx.fillStyle = e.hit > 0 ? "#333" : "#ff4d4d";
    const ey = e.r * 0.18;
    ctx.fillRect(-e.r * 0.45, ey - 2, e.r * 0.3, 3);
    ctx.fillRect(e.r * 0.15, ey - 2, e.r * 0.3, 3);
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.fillRect(-e.r * 0.6, e.r - 2, e.r * 1.2, 3);
    ctx.restore();

    if (e.hp < e.maxhp) {
      const w = d.boss ? 130 : e.r * 2.2;
      ctx.fillStyle = "rgba(0,0,0,.6)";
      ctx.fillRect(e.x - w / 2, e.y - e.r - 12, w, 4);
      ctx.fillStyle = d.boss ? COL.rift : "#e06060";
      ctx.fillRect(e.x - w / 2, e.y - e.r - 12, w * Math.max(0, Math.min(1, e.hp / e.maxhp)), 4);
    }
  }
}

export function drawBullets(): void {
  for (const b of state.bullets) {
    ctx.fillStyle = "#e3c8ff";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = COL.rift;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + 4, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/** 각 무기의 실루엣. 원점은 손, +x 가 정면이다. */
export function drawWeapon(tool: ToolId | null, active: boolean): void {
  const c = WEAPONS[tool ?? "wrench"].color;
  if (!tool) {
    ctx.fillStyle = c;
    ctx.fillRect(10, -2, 22, 4);
    ctx.fillRect(30, -5, 6, 10);
    return;
  }
  ctx.fillStyle = "#2a3330";
  ctx.fillRect(8, -5, 14, 10);
  ctx.fillStyle = c;
  if (tool === "driver") {
    ctx.fillRect(22, -3, 8, 6);
    ctx.fillStyle = "#dfe9e5";
    ctx.fillRect(30, -1.5, 12, 3);
  } else if (tool === "saw") {
    ctx.fillRect(22, -4, 10, 8);
    ctx.fillStyle = "#dfe9e5";
    ctx.fillRect(32, -2, 34, 4);
    ctx.fillStyle = c;
    for (let i = 0; i < 8; i++) ctx.fillRect(34 + i * 4, -5, 2, 3);
  } else if (tool === "hammer") {
    ctx.fillRect(22, -6, 12, 12);
    ctx.fillStyle = "#dfe9e5";
    ctx.fillRect(34, -3, 16, 6);
    ctx.fillStyle = c;
    ctx.fillRect(48, -2, 6, 4);
  } else if (tool === "grinder") {
    ctx.fillRect(22, -4, 8, 8);
    ctx.fillStyle = "#dfe9e5";
    ctx.beginPath();
    ctx.arc(34, 0, active ? 11 : 10, 0, 7);
    ctx.fill();
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(34, 0, 4, 0, 7);
    ctx.fill();
  }
}

export function drawPlayer(): void {
  const p = state.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.beginPath();
  ctx.ellipse(0, p.r - 1, p.r * 0.9, p.r * 0.35, 0, 0, 7);
  ctx.fill();
  if (p.inv > 0 && Math.floor(p.inv * 20) % 2 === 0) ctx.globalAlpha = 0.45;
  ctx.fillStyle = p.hurtT > 0 ? "#ffffff" : "#2f4b41";
  ctx.fillRect(-9, -6, 18, 16);
  ctx.fillStyle = p.hurtT > 0 ? "#ffffff" : COL.hero;
  ctx.beginPath();
  ctx.arc(0, -11, 8, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#101a17";
  ctx.beginPath();
  ctx.arc(Math.cos(p.face) * 3 - 3, -11 + Math.sin(p.face) * 2, 2.6, 0, 7);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(Math.cos(p.face) * 3 + 3, -11 + Math.sin(p.face) * 2, 2.6, 0, 7);
  ctx.fill();
  ctx.rotate(p.face);
  const sw = p.swing > 0 ? 1 - p.swing / 0.18 : 0;
  ctx.rotate(p.swing > 0 ? -0.9 + sw * 1.8 : 0.25);
  drawWeapon(state.tool, p.swing > 0);
  ctx.restore();

  if (p.swing > 0) {
    const a = 1 - p.swing / 0.18;
    const arc = stat.arc();
    ctx.save();
    ctx.globalAlpha = 0.35 * (1 - a);
    ctx.strokeStyle = state.tool ? curWeapon().color : "#eaffe0";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(p.x, p.y, stat.reach() * 0.85, p.face - 0.9 + a * 1.8 - arc / 2, p.face - 0.9 + a * 1.8 + arc / 2);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawParts(): void {
  for (const q of state.parts) {
    ctx.globalAlpha = Math.max(0, Math.min(1, q.life / q.max));
    ctx.fillStyle = q.color;
    if (q.text) {
      ctx.font = `bold ${q.size ?? 13}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(q.text, q.x, q.y);
    } else {
      const sz = q.sz ?? 2;
      ctx.fillRect(q.x - sz / 2, q.y - sz / 2, sz, sz);
    }
  }
  ctx.globalAlpha = 1;
}
