/** 장면을 PNG 로 렌더링하는 개발용 스크립트.
 *
 *   npm i --no-save @napi-rs/canvas
 *   npx vite-node scripts/shot.ts -- title stage:2 card:4 shop dead ending
 *
 * 브라우저 미리보기 패널을 띄울 수 없는 환경에서 화면을 눈으로 확인하려고 만들었다.
 * @napi-rs/canvas 는 package.json 에 넣지 않는다 — 게임 실행에도 CI 에도 필요 없다. */
import { GlobalFonts, createCanvas, loadImage } from "@napi-rs/canvas";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../.shots");

// 한글이 두부(□)로 나오지 않게 시스템 폰트를 sans-serif 로 등록한다
for (const f of ["malgun.ttf", "malgunbd.ttf"]) {
  try {
    GlobalFonts.registerFromPath(`C:/Windows/Fonts/${f}`, "sans-serif");
  } catch {
    /* 폰트가 없으면 기본 폰트로 그린다 */
  }
}

const store = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  },
  fetch: async () => ({ ok: false, status: 0, json: async () => [] }),
});

const { W, H } = await import("../src/config");
const { setCtx } = await import("../src/render/ctx");
// 구조분해하면 newGame 의 재할당을 놓친다 (라이브 바인딩이 끊긴다) — 네임스페이스로 받는다
const S = await import("../src/core/state");
const { beginChapter, gotoCard, newGame, setScene } = S;
const { update } = await import("../src/systems/update");
const { draw } = await import("../src/render");
const { CHAPTERS } = await import("../src/data/chapters");

const canvas = createCanvas(W, H);
setCtx(canvas.getContext("2d") as unknown as CanvasRenderingContext2D);

// 도트 스프라이트도 캔버스가 있어야 구워진다 — Node 쪽 캔버스를 꽂아 준다
const { setSurfaceFactory } = await import("../src/assets/bake");
setSurfaceFactory((w, h) => {
  const c = createCanvas(w, h);
  return { canvas: c as unknown as CanvasImageSource, ctx: c.getContext("2d") as unknown as CanvasRenderingContext2D };
});

// 타이틀 키 아트: public/ 에 있는 파일을 그대로 쓰고, ART=<경로> 로 갈아끼울 수 있다
const { setKeyArt } = await import("../src/assets/keyart");
for (const p of [process.env.ART, ...["png", "jpg", "jpeg", "webp"].map((e) => resolve(HERE, `../public/keyart.${e}`))]) {
  if (!p || !existsSync(p)) continue;
  const im = await loadImage(p);
  setKeyArt(im as unknown as CanvasImageSource, im.width, im.height);
  console.log("keyart:", p);
  break;
}

/** 정지 화면을 찍으면 밋밋해서, 몇 프레임 굴린 뒤에 찍는다 */
function settle(frames = 30): void {
  for (let i = 0; i < frames; i++) update(1 / 60);
}

function shot(name: string): void {
  draw();
  mkdirSync(OUT, { recursive: true });
  const file = resolve(OUT, `${name}.png`);
  writeFileSync(file, canvas.toBuffer("image/png"));
  console.log(file);
}

/** "stage:2" 처럼 콜론 뒤에 챕터 번호를 붙인다 */
function setup(spec: string): string {
  const [kind, argRaw] = spec.split(":");
  const i = Number(argRaw ?? 0) || 0;
  newGame();

  switch (kind) {
    case "title":
      setScene("title", 0);
      break;
    case "story":
      S.state.storyIdx = i;
      setScene("story", 0);
      break;
    case "card":
      S.state.pendingChapter = i;
      gotoCard();
      settle(20);
      break;
    case "stage":
      S.state.pendingChapter = i;
      beginChapter();
      settle(120);
      break;
    case "shop":
      S.state.pendingChapter = i || 3;
      S.state.gems = 64;
      S.state.up = { hp: 2, food: 1, atk: 1, spd: 0, dash: 0 };
      setScene("shop", 0);
      settle(20);
      break;
    case "rank":
      setScene("rank", 0);
      settle(10);
      break;
    case "dead":
      S.state.pendingChapter = i || 4;
      beginChapter();
      settle(60);
      S.state.score = 12480;
      S.state.sc = { kills: 9800, items: 2680, time: 0 };
      S.state.kills = 47;
      setScene("dead", 0);
      break;
    case "ending":
      S.state.pendingChapter = CHAPTERS.length - 1;
      beginChapter();
      settle(30);
      S.state.score = 31240;
      S.state.sc = { kills: 21400, items: 7140, time: 2700 };
      S.state.kills = 118;
      S.state.runTime = 300;
      setScene("ending", 0);
      break;
    default:
      throw new Error(`알 수 없는 장면: ${spec}`);
  }
  S.state.fade = 0;
  return spec.replace(":", "-");
}

const specs = process.argv.slice(2).filter((a) => !a.startsWith("-"));
for (const spec of specs.length ? specs : ["title"]) shot(setup(spec));
