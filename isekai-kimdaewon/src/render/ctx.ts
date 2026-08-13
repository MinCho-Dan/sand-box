import { COL, H, UI, W } from "../config";
import { CHAPTERS } from "../data/chapters";
import { state } from "../core/state";
import { clamp } from "../core/util";

/** 캔버스 컨텍스트는 main 에서 한 번 꽂아준다 */
export let ctx: CanvasRenderingContext2D = null as unknown as CanvasRenderingContext2D;
export const setCtx = (c: CanvasRenderingContext2D) => {
  ctx = c;
};

export const blink = () => Math.floor(state.time * 2) % 2 === 0;
/** 입력 잠금이 풀렸는가 */
export const ready = () => state.sceneLock <= 0;

export function bar(x: number, y: number, w: number, h: number, ratio: number, fill: string): void {
  ctx.fillStyle = "rgba(0,0,0,.55)";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, ratio)), h);
  ctx.strokeStyle = "rgba(255,255,255,.12)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

/** 전체 여정 대비 현재 위치. 칸 하나가 스테이지 하나고,
 *  현재 칸은 스테이지 안에서의 진행도만큼 차오른다.
 *  마지막(보스) 칸은 보라색으로 구분해 "끝이 저기"를 보여준다. */
export function stageTrack(x: number, y: number, w: number, h: number, cur: number, prog = 0): void {
  const n = CHAPTERS.length;
  const gap = h >= 6 ? 4 : 3;
  const seg = (w - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const sx = x + i * (seg + gap);
    const boss = CHAPTERS[i].kind === "boss";
    ctx.fillStyle = boss ? "rgba(176,108,255,.20)" : "rgba(255,255,255,.07)";
    ctx.fillRect(sx, y, seg, h);
    if (i < cur) {
      ctx.fillStyle = boss ? COL.rift : COL.heroDk;
      ctx.fillRect(sx, y, seg, h);
    } else if (i === cur) {
      ctx.fillStyle = boss ? "rgba(176,108,255,.34)" : UI.fillOn;
      ctx.fillRect(sx, y, seg, h);
      ctx.fillStyle = boss ? COL.rift : COL.hero;
      ctx.fillRect(sx, y, seg * clamp(prog, 0, 1), h);
      ctx.strokeStyle = boss ? COL.rift : COL.hero;
      ctx.lineWidth = 1;
      ctx.strokeRect(sx - 0.5, y - 1.5, seg + 1, h + 3);
    }
  }
}

export function clearScreen(color = COL.bg): void {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
}

/** 화면 하단의 "탭하여 계속" 안내.
 *  잠금 중에는 흐리게 — 탭이 안 먹는 이유를 보여준다. */
export function tapPrompt(y: number, touchOn: boolean): void {
  const label = touchOn ? "화면을 탭하여 계속" : "— Enter —";
  ctx.textAlign = "center";
  ctx.font = "bold 14px sans-serif";
  ctx.fillStyle = !ready() ? "#2c3559" : blink() ? COL.hero : "#6b6134";
  ctx.fillText(label, W / 2, y);
}

export const fmt = (n: number) => n.toLocaleString("en-US");
