import { BATT_MAX } from "../data/weapons";
import { COL, CTRL_H, H, HUD_H, UI, W } from "../config";
import { UP_MAX, upCostAt } from "../data/upgrades";
import { chapterLabel, curWeapon, currentChapter, stageProgress, state, stat } from "../core/state";
import { canBuy, levelCapped } from "../systems/shop";
import { sceneButtons } from "../systems/ui";
import type { UpgradeId } from "../types";
import { bar, blink, ctx, ready, stageTrack } from "./ctx";

export function drawHUD(): void {
  const p = state.player;
  const ch = currentChapter(state.chapterIdx);
  const hpR = p.hp / stat.maxhp();
  const fdR = p.hunger / stat.maxfood();

  ctx.fillStyle = COL.panel;
  ctx.fillRect(0, 0, W, HUD_H);

  ctx.textAlign = "left";
  ctx.font = "11px sans-serif";
  ctx.fillStyle = COL.dim;
  ctx.fillText("체력", 16, 22);
  bar(78, 12, 164, 12, hpR, hpR < 0.3 ? COL.danger : "#46d17f");
  ctx.fillStyle = COL.dim;
  ctx.fillText("허기", 16, 41);
  bar(78, 31, 164, 12, fdR, fdR < 0.25 ? COL.fire : COL.food);

  // 라벨은 현재 무기, 게이지는 배터리. 렌치일 땐 비축량을 흐리게 보여준다.
  const wp = curWeapon();
  const on = !!state.tool;
  ctx.fillStyle = on ? wp.color : COL.dim;
  ctx.font = "10px sans-serif";
  ctx.fillText(wp.name, 16, 60);
  bar(78, 50, 164, 12, state.battery / BATT_MAX, on ? (state.battery < 25 ? COL.fire : COL.batt) : "rgba(111,228,255,.26)");

  ctx.textAlign = "right";
  ctx.fillStyle = COL.gem;
  ctx.font = "bold 18px sans-serif";
  ctx.fillText("◆ " + state.gems, W - 16, 28);
  ctx.fillStyle = COL.text;
  ctx.font = "bold 14px sans-serif";
  ctx.fillText(String(state.score).padStart(6, "0"), W - 16, 50);

  ctx.fillStyle = "rgba(255,255,255,.04)";
  ctx.fillRect(16, 66, W - 32, 24);
  ctx.textAlign = "left";
  ctx.font = "bold 12px sans-serif";
  ctx.fillStyle = COL.dim;
  const label = chapterLabel(state.chapterIdx);
  ctx.fillText(label, 26, 83);
  ctx.fillStyle = COL.text;
  ctx.fillText(ch.name, 26 + ctx.measureText(label).width + 10, 83);
  ctx.textAlign = "right";
  ctx.font = "12px sans-serif";
  ctx.fillStyle = COL.dim;
  ctx.fillText(
    ch.kind === "scavenge" ? `보급품 ${p.supplies} / ${ch.need ?? 0}` : `남은 적 ${state.enemies.length}`,
    W - 26, 83,
  );

  // 전체 여정 중 지금 어디쯤인지 — HUD 맨 아래를 가로지르는 트랙. 무한모드는 끝이 없어 생략한다.
  if (state.mode === "story") stageTrack(16, HUD_H - 10, W - 32, 6, state.chapterIdx, stageProgress());
}

/** 아레나 아래 예약된 밴드. 터치 모드에서는 DOM 버튼이 이 위에 올라가고,
 *  PC 모드에서는 빈 공간이 아깝지 않도록 조작 안내를 채운다. */
export function drawControlBand(touchOn: boolean): void {
  const y = H - CTRL_H;
  ctx.fillStyle = COL.panel;
  ctx.fillRect(0, y, W, CTRL_H);
  ctx.fillStyle = UI.lineDim;
  ctx.fillRect(0, y, W, 1);
  if (touchOn) return;

  ctx.textAlign = "center";
  ctx.fillStyle = COL.dim;
  ctx.font = "13px sans-serif";
  ctx.fillText("이동 WASD · 방향키", W / 2, y + 70);
  ctx.fillText("공격 J · 회피 K", W / 2, y + 96);
  ctx.fillText("음소거 M", W / 2, y + 122);
}

export function drawButtons(): void {
  for (const b of sceneButtons()) {
    const on = b.kind === "buy" ? canBuy(b.id as UpgradeId) : ready();
    ctx.fillStyle = on ? UI.btn : UI.btnOff;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = on ? UI.line : UI.offLine;
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    if (on) {
      // 위쪽 모서리에 얇은 금색 하이라이트 — 눌리는 판처럼 보이게
      ctx.fillStyle = "rgba(255,215,94,.16)";
      ctx.fillRect(b.x + 2, b.y + 2, b.w - 4, 2);
    }
    ctx.textAlign = "center";
    ctx.fillStyle = on ? COL.hero : UI.offText;

    if (b.kind === "buy") {
      const id = b.id as UpgradeId;
      const lv = state.up[id];
      ctx.font = "bold 15px sans-serif";
      const maxed = levelCapped(id) && lv >= UP_MAX;
      ctx.fillText(maxed ? "MAX" : "◆ " + upCostAt(lv), b.x + b.w / 2, b.y + b.h / 2 + 5);
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
    ctx.fillStyle = "rgba(8,11,24,.88)";
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
