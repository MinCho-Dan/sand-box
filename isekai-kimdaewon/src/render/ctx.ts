import { COL, H, W } from "../config";
import { state } from "../core/state";

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

export function clearScreen(color = "#0b0f10"): void {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
}

/** 화면 하단의 "탭하여 계속" 안내.
 *  잠금 중에는 흐리게 — 탭이 안 먹는 이유를 보여준다. */
export function tapPrompt(y: number, touchOn: boolean): void {
  const label = touchOn ? "화면을 탭하여 계속" : "— Enter —";
  ctx.textAlign = "center";
  ctx.font = "bold 14px sans-serif";
  ctx.fillStyle = !ready() ? "#243a34" : blink() ? COL.hero : "#33544a";
  ctx.fillText(label, W / 2, y);
}

export const fmt = (n: number) => n.toLocaleString("en-US");
