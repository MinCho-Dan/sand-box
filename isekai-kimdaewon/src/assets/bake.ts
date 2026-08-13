import { PAL, SPRITES, type SpriteId } from "./sprites";

/** 스프라이트를 오프스크린 캔버스에 한 번 구워 두고 그 뒤로는 drawImage 만 한다.
 *  매 프레임 사각형 수백 개를 찍는 것보다 훨씬 싸다. */

interface Surface {
  canvas: CanvasImageSource;
  ctx: CanvasRenderingContext2D;
}

let factory: ((w: number, h: number) => Surface) | null = null;

/** 브라우저가 아닌 곳(scripts/shot.ts)에서 캔버스를 만들어 넣는 통로 */
export function setSurfaceFactory(f: (w: number, h: number) => Surface): void {
  factory = f;
  cache.clear();
}

function surface(w: number, h: number): Surface | null {
  if (factory) return factory(w, h);
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  return ctx ? { canvas, ctx } : null;
}

const cache = new Map<string, CanvasImageSource | null>();

export function spriteSize(id: SpriteId): { w: number; h: number } {
  const d = SPRITES[id];
  return { w: d.rows[0].length * d.scale, h: d.rows.length * d.scale };
}

/** tint 를 주면 불투명한 픽셀을 전부 그 색으로 칠한 실루엣을 굽는다 (피격 번쩍임) */
export function sprite(id: SpriteId, tint?: string): CanvasImageSource | null {
  const key = tint ? `${id}|${tint}` : id;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const def = SPRITES[id];
  const cols = def.rows[0].length;
  for (const row of def.rows) {
    if (row.length !== cols) throw new Error(`스프라이트 ${id}: 행 길이가 다르다 (${row.length} ≠ ${cols})`);
  }

  const { w, h } = spriteSize(id);
  const su = surface(w, h);
  if (!su) {
    cache.set(key, null);
    return null;
  }

  const s = def.scale;
  for (let y = 0; y < def.rows.length; y++) {
    const row = def.rows[y];
    for (let x = 0; x < cols; x++) {
      const col = tint ?? PAL[row[x]];
      if (!col || (!tint && !PAL[row[x]])) continue;
      if (row[x] === ".") continue;
      su.ctx.fillStyle = col;
      su.ctx.fillRect(x * s, y * s, s, s);
    }
  }
  cache.set(key, su.canvas);
  return su.canvas;
}

/** 스프라이트를 (cx, cy) 중심에 그린다. 성공하면 true.
 *  캔버스를 만들 수 없는 환경(테스트)에서는 false 를 돌려주고,
 *  호출한 쪽이 기존 도형 그리기로 넘어간다. */
export function blit(
  ctx: CanvasRenderingContext2D,
  id: SpriteId,
  cx: number,
  cy: number,
  tint?: string,
): boolean {
  const im = sprite(id, tint);
  if (!im) return false;
  const { w, h } = spriteSize(id);
  ctx.drawImage(im, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
  return true;
}
