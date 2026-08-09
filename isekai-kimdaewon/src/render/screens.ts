import { COL, H, TS, W } from "../config";
import { CHAPTERS, ENDING_TEXT, STORY } from "../data/chapters";
import { CODEX, ENEMY_DEF } from "../data/enemies";
import { UPGRADES, UP_MAX } from "../data/upgrades";
import { getBest } from "../core/save";
import { newEnemiesFor, state } from "../core/state";
import { SUPPLY_SCORE } from "../systems/items";
import { rank, RANK_LIMIT } from "../systems/ranking";
import { SHOP_ROW_H, SHOP_ROW_Y } from "../systems/shop";
import { blink, clearScreen, ctx, fmt, tapPrompt } from "./ctx";
import { drawButtons } from "./hud";

const SCORE_RULE = "점수 = 처치 + 보급품 + 클리어 시간 보너스";

/** 결과 화면의 점수 내역표 */
function drawScoreBreakdown(y: number, cleared: boolean): number {
  const rows: [string, number][] = [
    ["처치 점수", state.sc.kills],
    ["보급품", state.sc.items],
  ];
  if (cleared) rows.push(["클리어 시간 보너스", state.sc.time]);

  ctx.font = "13px sans-serif";
  for (const [label, val] of rows) {
    ctx.textAlign = "left";
    ctx.fillStyle = COL.dim;
    ctx.fillText(label, 96, y);
    ctx.textAlign = "right";
    ctx.fillStyle = COL.text;
    ctx.fillText(fmt(val), W - 96, y);
    y += 22;
  }

  ctx.strokeStyle = "rgba(143,227,192,.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(96, y - 12);
  ctx.lineTo(W - 96, y - 12);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = COL.food;
  ctx.font = "bold 15px sans-serif";
  ctx.fillText("최종 점수", 96, y + 8);
  ctx.textAlign = "right";
  ctx.fillText(fmt(state.score), W - 96, y + 8);

  if (!cleared) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#4a635a";
    ctx.font = "11px sans-serif";
    ctx.fillText("마왕을 쓰러뜨리면 시간 보너스가 붙는다", W / 2, y + 32);
  }
  return y + 44;
}

/* ── 타이틀 ── */
export function drawTitle(touchOn: boolean): void {
  const t = state.time;
  clearScreen("#0b0f10");

  ctx.strokeStyle = "rgba(80,140,120,.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += TS) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += TS) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // 허공에 뜬 동그란 유리창
  ctx.save();
  ctx.translate(W / 2, 290);
  for (let i = 4; i >= 0; i--) {
    ctx.globalAlpha = 0.06 + i * 0.02;
    ctx.fillStyle = "#8ce07a";
    ctx.beginPath();
    ctx.arc(0, 0, 62 + i * 20 + Math.sin(t * 2 + i) * 5, 0, 7);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const R = 62;
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, 7);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, -R, 0, R);
  sky.addColorStop(0, "#8fd4ff");
  sky.addColorStop(0.6, "#d6f1ff");
  ctx.fillStyle = sky;
  ctx.fillRect(-R, -R, R * 2, R * 2);
  ctx.fillStyle = "#fff6c9";
  ctx.beginPath();
  ctx.arc(-R * 0.5, -R * 0.5, 11, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#4ea84c";
  ctx.beginPath();
  ctx.moveTo(-R, 8);
  for (let x = -R; x <= R; x += 4) ctx.lineTo(x, 8 + Math.sin(x * 0.09 + t) * 5);
  ctx.lineTo(R, R);
  ctx.lineTo(-R, R);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#6ec95f";
  for (let i = 0; i < 14; i++) ctx.fillRect(-R + i * 9, 22 + Math.sin(t * 2 + i) * 2, 2, 9);
  ctx.restore();
  ctx.strokeStyle = "#dff3ff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, 7);
  ctx.stroke();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, R - 6, -2.6, -1.4);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = COL.hero;
  const hx = Math.sin(t * 1.2) * 3;
  ctx.fillRect(R - 12 + hx, -6, 13, 16);
  ctx.fillRect(R + 1 + hx, 6, 16, 5);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillStyle = COL.dim;
  ctx.font = "13px sans-serif";
  ctx.fillText("단기 4361년 · 인류의 마지막 생존자", W / 2, 440);
  ctx.fillStyle = COL.hero;
  ctx.font = "bold 38px sans-serif";
  ctx.fillText("이세계전사 김대원", W / 2, 490);
  ctx.fillStyle = blink() ? "#ffd166" : "#6b5a2e";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("★ 지금 다운로드하세요 ★", W / 2, 520);

  ctx.fillStyle = COL.dim;
  ctx.font = "13px sans-serif";
  if (touchOn) {
    ctx.fillText("왼쪽 화면을 끌어 이동", W / 2, 590);
    ctx.fillText("오른쪽 [공격] [회피] 버튼", W / 2, 612);
  } else {
    ctx.fillText("이동 WASD·방향키    공격 J·Space", W / 2, 590);
    ctx.fillText("회피 K·Shift    음소거 M", W / 2, 612);
  }
  ctx.fillText("허기가 0이 되면 체력이 깎인다.", W / 2, 644);
  ctx.fillStyle = "#4a635a";
  ctx.font = "12px sans-serif";
  ctx.fillText(SCORE_RULE, W / 2, 668);

  if (getBest() > 0) {
    ctx.fillStyle = COL.food;
    ctx.font = "bold 15px sans-serif";
    ctx.fillText("최고 점수  " + fmt(getBest()), W / 2, 724);
  }

  drawButtons();
}

/* ── 스토리 ── */
export function drawStory(touchOn: boolean): void {
  clearScreen("#07090a");
  const lines = STORY[Math.min(state.storyIdx, STORY.length - 1)].split("\n");
  ctx.textAlign = "center";
  let y = H / 2 - lines.length * 13;
  ctx.fillStyle = COL.text;
  ctx.font = "16px sans-serif";
  for (const ln of lines) {
    ctx.fillText(ln, W / 2, y);
    y += 26;
  }
  ctx.fillStyle = "rgba(0,0,0,.18)";
  for (let sy = 0; sy < H; sy += 4) ctx.fillRect(0, sy, W, 1);
  tapPrompt(H - 120, touchOn);
}

/* ── 스테이지 카드 ── */
export function drawCard(touchOn: boolean): void {
  const i = state.pendingChapter;
  const ch = CHAPTERS[i];
  clearScreen("#07090a");
  ctx.textAlign = "center";

  ctx.fillStyle = COL.dim;
  ctx.font = "bold 15px sans-serif";
  ctx.fillText("STAGE " + (i + 1), W / 2, 250);
  ctx.fillStyle = COL.hero;
  ctx.font = "bold 30px sans-serif";
  ctx.fillText(ch.name, W / 2, 292);

  ctx.strokeStyle = "rgba(143,227,192,.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(90, 316);
  ctx.lineTo(W - 90, 316);
  ctx.stroke();

  const total = Object.values(ch.spawn ?? {}).reduce((a, b) => a + (b ?? 0), 0);
  const goal =
    ch.kind === "scavenge" ? `보급품 ${ch.need}개를 모아라`
    : ch.kind === "boss" ? "마왕 현상을 쓰러뜨려라"
    : `적 ${total}마리를 처치하라`;
  ctx.fillStyle = COL.text;
  ctx.font = "14px sans-serif";
  ctx.fillText("목표 — " + goal, W / 2, 350);
  ctx.fillStyle = COL.dim;
  ctx.font = "italic 13px sans-serif";
  ctx.fillText(`"${ch.flavor}"`, W / 2, 382);

  let y = 460;
  for (const t of newEnemiesFor(i)) {
    const d = ENEMY_DEF[t];
    ctx.fillStyle = "rgba(255,209,102,.08)";
    ctx.fillRect(50, y - 34, W - 100, 96);
    ctx.strokeStyle = "rgba(255,209,102,.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(50.5, y - 33.5, W - 101, 95);

    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.arc(90, y + 4, Math.min(d.r, 18), 0, 7);
    ctx.fill();
    ctx.fillStyle = "#ff4d4d";
    ctx.fillRect(84, y + 1, 4, 3);
    ctx.fillRect(93, y + 1, 4, 3);

    ctx.textAlign = "left";
    ctx.fillStyle = COL.food;
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("NEW", 122, y - 10);
    ctx.fillStyle = COL.text;
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(d.name, 122, y + 10);
    ctx.textAlign = "right";
    ctx.fillStyle = COL.food;
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`${d.score}점 · ◆${d.gem}`, W - 68, y + 10);
    ctx.textAlign = "left";
    ctx.fillStyle = COL.dim;
    ctx.font = "12px sans-serif";
    let ly = y + 30;
    for (const ln of CODEX[t].split("\n")) {
      ctx.fillText(ln, 122, ly);
      ly += 16;
    }
    ctx.textAlign = "center";
    y += 116;
  }

  tapPrompt(H - 120, touchOn);
}

/* ── 상점 ── */
export function drawShop(touchOn: boolean): void {
  clearScreen("#090d0c");
  ctx.textAlign = "center";
  ctx.fillStyle = COL.hero;
  ctx.font = "bold 26px sans-serif";
  ctx.fillText("보급 상점", W / 2, 120);
  ctx.fillStyle = COL.dim;
  ctx.font = "12px sans-serif";
  ctx.fillText("다음 스테이지로 떠나기 전에", W / 2, 146);
  ctx.fillStyle = COL.gem;
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("◆ " + state.gems, W / 2, 190);

  UPGRADES.forEach((u, i) => {
    const y = SHOP_ROW_Y + i * SHOP_ROW_H;
    const lv = state.up[u.id];
    ctx.fillStyle = "rgba(255,255,255,.03)";
    ctx.fillRect(16, y - 34, W - 32, 72);
    ctx.textAlign = "left";
    ctx.fillStyle = COL.text;
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(u.name, 32, y - 8);
    ctx.fillStyle = COL.dim;
    ctx.font = "11px sans-serif";
    ctx.fillText(u.eff, 32, y + 10);
    for (let k = 0; k < UP_MAX; k++) {
      ctx.fillStyle = k < lv ? COL.hero : "rgba(143,227,192,.16)";
      ctx.fillRect(32 + k * 18, y + 20, 13, 5);
    }
  });

  drawButtons();

  ctx.textAlign = "center";
  ctx.fillStyle = COL.dim;
  ctx.font = "11px sans-serif";
  ctx.fillText(touchOn ? "항목을 눌러 구입 · [출발]로 다음 스테이지" : "클릭하여 구입 · Enter 로 출발", W / 2, H - 48);

  if (state.fade > 0) {
    ctx.fillStyle = `rgba(0,0,0,${state.fade})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/* ── 랭킹 ── */
export function drawRank(): void {
  clearScreen("#090d0c");
  ctx.textAlign = "center";
  ctx.fillStyle = COL.hero;
  ctx.font = "bold 26px sans-serif";
  ctx.fillText("랭킹", W / 2, 110);
  ctx.fillStyle = COL.dim;
  ctx.font = "12px sans-serif";
  ctx.fillText(SCORE_RULE, W / 2, 134);

  const rows = rank.rows;
  if (rank.status === "loading" && !rows) {
    ctx.fillStyle = COL.dim;
    ctx.font = "14px sans-serif";
    ctx.fillText("불러오는 중…", W / 2, 300);
  } else if (rank.status === "error" && !(rows && rows.length)) {
    ctx.fillStyle = "#ff8a8a";
    ctx.font = "14px sans-serif";
    ctx.fillText("랭킹을 불러오지 못했습니다", W / 2, 292);
    ctx.fillStyle = COL.dim;
    ctx.font = "12px sans-serif";
    ctx.fillText("네트워크 연결을 확인해 주세요", W / 2, 316);
  } else if (!rows || !rows.length) {
    ctx.fillStyle = COL.dim;
    ctx.font = "14px sans-serif";
    ctx.fillText("아직 등록된 기록이 없습니다", W / 2, 292);
    ctx.fillText("첫 번째 생존자가 되어보세요", W / 2, 318);
  } else {
    ctx.textAlign = "left";
    ctx.font = "10px sans-serif";
    ctx.fillStyle = COL.dim;
    ctx.fillText("순위", 26, 176);
    ctx.fillText("닉네임", 76, 176);
    ctx.textAlign = "right";
    ctx.fillText("스테이지", W - 118, 176);
    ctx.fillText("점수", W - 26, 176);
    ctx.strokeStyle = "rgba(143,227,192,.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 184);
    ctx.lineTo(W - 20, 184);
    ctx.stroke();

    rows.slice(0, RANK_LIMIT).forEach((r, i) => {
      const y = 212 + i * 32;
      const me = i === rank.mine;
      if (me) {
        ctx.fillStyle = "rgba(143,227,192,.12)";
        ctx.fillRect(20, y - 18, W - 40, 28);
      }
      ctx.textAlign = "left";
      ctx.font = "bold 13px sans-serif";
      ctx.fillStyle = i === 0 ? "#ffd166" : i === 1 ? "#d8e4e0" : i === 2 ? "#d99a5b" : COL.dim;
      ctx.fillText(String(i + 1), 28, y);
      ctx.fillStyle = me ? COL.hero : COL.text;
      ctx.font = (me ? "bold " : "") + "14px sans-serif";
      ctx.fillText(String(r.nick ?? "?").slice(0, 12), 76, y);
      ctx.textAlign = "right";
      ctx.fillStyle = COL.dim;
      ctx.font = "12px sans-serif";
      ctx.fillText(String(r.stage ?? "-"), W - 128, y);
      ctx.fillStyle = me ? COL.hero : COL.text;
      ctx.font = "bold 14px sans-serif";
      ctx.fillText(fmt(r.score), W - 26, y);
    });

    ctx.textAlign = "center";
    if (rank.notice) {
      ctx.fillStyle = "#ffb35c";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText(rank.notice, W / 2, H - 162);
      if (rank.mine >= 0) {
        ctx.fillStyle = COL.dim;
        ctx.font = "12px sans-serif";
        ctx.fillText(`현재 ${rank.mine + 1}위를 유지합니다`, W / 2, H - 140);
      }
    } else if (rank.mine >= 0) {
      ctx.fillStyle = COL.hero;
      ctx.font = "bold 14px sans-serif";
      ctx.fillText(`${rank.mine + 1}위로 등록되었습니다`, W / 2, H - 140);
    }
  }

  drawButtons();
}

/* ── 엔딩 ── */
export function drawEnding(): void {
  clearScreen("#07090a");
  ctx.textAlign = "center";
  ctx.fillStyle = COL.hero;
  ctx.font = "bold 28px sans-serif";
  ctx.fillText("마왕 현상, 소멸", W / 2, 150);

  ctx.font = "15px sans-serif";
  ctx.fillStyle = COL.text;
  let y = 208;
  for (const ln of ENDING_TEXT) {
    ctx.fillText(ln, W / 2, y);
    y += 24;
  }

  const after = drawScoreBreakdown(560, true);
  ctx.textAlign = "center";
  ctx.fillStyle = COL.dim;
  ctx.font = "13px sans-serif";
  ctx.fillText(`처치 ${state.kills}   ·   생존 ${state.runTime.toFixed(1)}초`, W / 2, after);
  ctx.fillText("최고 점수 " + fmt(getBest()), W / 2, after + 22);

  drawButtons();
}

/* ── 사망 ── */
export function drawDead(): void {
  ctx.fillStyle = "rgba(0,0,0,.8)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ff6b6b";
  ctx.font = "bold 32px sans-serif";
  ctx.fillText("인류, 완전히 멸종", W / 2, 200);
  ctx.fillStyle = COL.dim;
  ctx.font = "14px sans-serif";
  ctx.fillText(`STAGE ${state.chapterIdx + 1} · ${CHAPTERS[state.chapterIdx].name} 에서 쓰러졌다`, W / 2, 234);

  const after = drawScoreBreakdown(300, false);
  ctx.textAlign = "center";
  ctx.fillStyle = COL.dim;
  ctx.font = "13px sans-serif";
  ctx.fillText(`처치 ${state.kills}   ·   생존 ${state.runTime.toFixed(1)}초`, W / 2, after);
  ctx.fillText("최고 점수 " + fmt(getBest()), W / 2, after + 22);

  drawButtons();
}

export { SUPPLY_SCORE };
