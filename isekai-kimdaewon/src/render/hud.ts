import { BATT_MAX } from "../data/weapons";
import { COL, H, HUD_H, W } from "../config";
import { CHAPTERS } from "../data/chapters";
import { UP_COST, UP_MAX } from "../data/upgrades";
import { curWeapon, state, stat } from "../core/state";
import { canBuy } from "../systems/shop";
import { sceneButtons } from "../systems/ui";
import type { UpgradeId } from "../types";
import { bar, blink, ctx, ready } from "./ctx";

export function drawHUD(): void {
  const p = state.player;
  const ch = CHAPTERS[state.chapterIdx];
  const hpR = p.hp / stat.maxhp();
  const fdR = p.hunger / stat.maxfood();

  ctx.fillStyle = "#0a100e";
  ctx.fillRect(0, 0, W, HUD_H);
  ctx.fillStyle = "rgba(143,227,192,.14)";
  ctx.fillRect(0, HUD_H - 2, W, 2);

  ctx.textAlign = "left";
  ctx.font = "11px sans-serif";
  ctx.fillStyle = COL.dim;
  ctx.fillText("체력", 16, 22);
  bar(78, 12, 164, 12, hpR, hpR < 0.3 ? "#ff5c5c" : "#4fd18b");
  ctx.fillStyle = COL.dim;
  ctx.fillText("허기", 16, 41);
  bar(78, 31, 164, 12, fdR, fdR < 0.25 ? "#ff8a3d" : "#ffd166");

  // 라벨은 현재 무기, 게이지는 배터리. 렌치일 땐 비축량을 흐리게 보여준다.
  const wp = curWeapon();
  const on = !!state.tool;
  ctx.fillStyle = on ? wp.color : COL.dim;
  ctx.font = "10px sans-serif";
  ctx.fillText(wp.name, 16, 60);
  bar(78, 50, 164, 12, state.battery / BATT_MAX, on ? (state.battery < 25 ? "#ff8a3d" : COL.batt) : "rgba(127,224,255,.30)");

  ctx.textAlign = "right";
  ctx.fillStyle = COL.gem;
  ctx.font = "bold 18px sans-serif";
  ctx.fillText("◆ " + state.gems, W - 16, 28);
  ctx.fillStyle = COL.text;
  ctx.font = "bold 14px sans-serif";
  ctx.fillText(String(state.score).padStart(6, "0"), W - 16, 50);

  ctx.fillStyle = "rgba(255,255,255,.05)";
  ctx.fillRect(16, 68, W - 32, 26);
  ctx.textAlign = "left";
  ctx.font = "bold 12px sans-serif";
  ctx.fillStyle = COL.text;
  ctx.fillText(`STAGE ${state.chapterIdx + 1} · ${ch.name}`, 26, 86);
  ctx.textAlign = "right";
  ctx.font = "12px sans-serif";
  ctx.fillStyle = COL.dim;
  ctx.fillText(
    ch.kind === "scavenge" ? `보급품 ${p.supplies} / ${ch.need ?? 0}` : `남은 적 ${state.enemies.length}`,
    W - 26, 86,
  );
}

export function drawButtons(): void {
  for (const b of sceneButtons()) {
    const on = b.kind === "buy" ? canBuy(b.id as UpgradeId) : ready();
    ctx.fillStyle = on ? "rgba(143,227,192,.16)" : "rgba(40,55,50,.25)";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = on ? "rgba(143,227,192,.6)" : "rgba(80,110,100,.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    ctx.textAlign = "center";
    ctx.fillStyle = on ? COL.hero : "#4a635a";

    if (b.kind === "buy") {
      const lv = state.up[b.id as UpgradeId];
      ctx.font = "bold 15px sans-serif";
      ctx.fillText(lv >= UP_MAX ? "MAX" : "◆ " + UP_COST[lv], b.x + b.w / 2, b.y + b.h / 2 + 5);
    } else {
      const label = b.label ?? (b.kind === "go" ? "출발" : "다시 시작");
      const big = b.h >= 58;
      ctx.font = `bold ${big ? 19 : 15}px sans-serif`;
      ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + (big ? 7 : 5));
    }
  }
}

export function drawOverlays(touchOn: boolean): void {
  if (state.toastT > 0) {
    ctx.globalAlpha = Math.max(0, Math.min(1, state.toastT));
    ctx.fillStyle = "rgba(6,10,9,.82)";
    ctx.textAlign = "center";
    ctx.font = "bold 15px sans-serif";
    const w = ctx.measureText(state.toast).width + 36;
    ctx.fillRect(W / 2 - w / 2, HUD_H + 14, w, 32);
    ctx.fillStyle = COL.text;
    ctx.fillText(state.toast, W / 2, HUD_H + 35);
    ctx.globalAlpha = 1;
  }

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255,120,120,${state.flash * 0.22})`;
    ctx.fillRect(0, 0, W, H);
  }

  const p = state.player;
  if (state.scene === "play" && p.hp / stat.maxhp() < 0.35) {
    const g = ctx.createRadialGradient(W / 2, H / 2, 220, W / 2, H / 2, 640);
    g.addColorStop(0, "rgba(255,0,0,0)");
    g.addColorStop(1, `rgba(180,0,0,${0.18 + Math.sin(state.time * 5) * 0.06})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  if (state.scene === "bossdown") {
    const t = Math.max(0, Math.min(1, state.seqT / 1.4));
    ctx.fillStyle = `rgba(255,255,255,${(1 - t) * 0.5})`;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgba(0,0,0,${t * 0.85})`;
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.globalAlpha = Math.max(0, Math.min(1, t * 1.6));
    ctx.fillStyle = COL.hero;
    ctx.font = "bold 30px sans-serif";
    ctx.fillText("마왕 격파", W / 2, H / 2);
    ctx.globalAlpha = 1;
  }

  if (state.fade > 0) {
    ctx.fillStyle = `rgba(0,0,0,${state.fade})`;
    ctx.fillRect(0, 0, W, H);
  }
  void touchOn;
  void blink;
}
