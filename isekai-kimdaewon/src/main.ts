import { bgmTick } from "./audio";
import { loadKeyArt } from "./assets/keyart";
import { H, W } from "./config";
import { setupInput } from "./core/input";
import { input, touch } from "./core/inputState";
import { beginChapter, gotoCard, newGame, setScene, state } from "./core/state";
import { draw } from "./render";
import { setCtx } from "./render/ctx";
import { setupRankForm, syncRankForm } from "./ui/rankForm";
import { currentMood, update } from "./systems/update";
import { handleAdvance } from "./systems/ui";

const canvas = document.getElementById("cv") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
setCtx(ctx);

/** 표시 크기는 CSS 비율 계산에 맡기지 않고 직접 픽셀로 지정한다.
 *  documentElement.clientHeight 는 html 이 position:fixed 라 실제 보이는 높이를 준다
 *  (100vh 와 달리 주소창 유무에 속지 않는다). */
function fitCanvas(): void {
  const de = document.documentElement;
  const vw = de.clientWidth || W;
  const vh = de.clientHeight || H;
  const s = Math.min(vw / W, vh / H);
  const wrap = document.getElementById("wrap") as HTMLElement;
  wrap.style.width = Math.floor(W * s) + "px";
  wrap.style.height = Math.floor(H * s) + "px";

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

let last = performance.now();
function loop(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (input.enterEdge) {
    input.enterEdge = false;
    handleAdvance();
  }
  update(state.scene === "bossdown" ? dt * 0.35 : dt); // 격파 연출은 슬로모션
  bgmTick(currentMood());
  draw();

  document.body.classList.toggle("playing", state.scene === "play");
  document.body.classList.toggle("touch", touch.on);
  syncRankForm();

  requestAnimationFrame(loop);
}

/** 개발 중 화면 확인용. 콘솔에서 __dbg.stage(6) / __dbg.scene("ending") 으로
 *  아무 장면이나 바로 띄운다. `npm run build`(production) 에서는 통째로 제거된다.
 *  빌드해서 확인해야 할 때는 `vite build --mode development`. */
if (import.meta.env.MODE !== "production") {
  (window as unknown as Record<string, unknown>).__dbg = {
    // state 는 newGame 에서 재할당되므로 게터로 노출해야 최신 것을 본다
    get state() {
      return state;
    },
    stage(i: number) {
      newGame();
      state.pendingChapter = i;
      beginChapter();
    },
    card(i: number) {
      newGame();
      state.pendingChapter = i;
      gotoCard();
    },
    scene: setScene,
  };
}

loadKeyArt();
newGame();
fitCanvas();
setupInput(canvas);
setupRankForm();
addEventListener("resize", fitCanvas);
draw();
requestAnimationFrame(loop);
