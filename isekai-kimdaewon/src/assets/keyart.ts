import { H, W } from "../config";

/** 타이틀 배경으로 쓰는 키 아트.
 *
 *  `public/` 에 아래 이름 중 하나로 넣어 두면 자동으로 잡힌다.
 *  파일이 없으면 타이틀은 도형으로 그린 폴백 화면을 쓰므로 게임은 그대로 돈다.
 *  헤드리스(테스트 · scripts/shot.ts)에는 Image 가 없어 setKeyArt 로 직접 꽂는다. */
const CANDIDATES = ["keyart.png", "keyart.jpg", "keyart.jpeg", "keyart.webp"];

let art: CanvasImageSource | null = null;
let aw = 0;
let ah = 0;

export const keyArt = (): CanvasImageSource | null => art;

export function setKeyArt(im: CanvasImageSource, w: number, h: number): void {
  art = im;
  aw = w;
  ah = h;
}

export function loadKeyArt(): void {
  if (typeof Image === "undefined") return;
  const tryAt = (i: number): void => {
    if (i >= CANDIDATES.length) return;
    const im = new Image();
    im.onload = () => setKeyArt(im, im.naturalWidth, im.naturalHeight);
    im.onerror = () => tryAt(i + 1);
    im.src = CANDIDATES[i];
  };
  tryAt(0);
}

/** 캔버스를 가득 채우도록 잘라 그린다 (CSS object-fit: cover 와 같다).
 *  비율이 어떻든 빈 여백이 생기지 않아, 어떤 크기의 이미지를 넣어도 안전하다. */
export function drawCover(ctx: CanvasRenderingContext2D, im: CanvasImageSource): void {
  if (!aw || !ah) return;
  const s = Math.max(W / aw, H / ah);
  const dw = aw * s;
  const dh = ah * s;
  ctx.drawImage(im, (W - dw) / 2, (H - dh) / 2, dw, dh);
}
