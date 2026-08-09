import { AH, MH, MW, TS, W } from "../config";
import type { Body, Grid, Vec } from "../types";
import { dist, rnd } from "./util";
import type { Chapter } from "../data/chapters";

export function makeMap(ch: Chapter): Grid {
  const g: Grid = [];
  for (let y = 0; y < MH; y++) {
    g[y] = [];
    for (let x = 0; x < MW; x++) {
      g[y][x] = x === 0 || y === 0 || x === MW - 1 || y === MH - 1 ? 1 : 0;
    }
  }

  if (ch.kind === "scavenge") {
    // 마트 진열대: 세로 선반 + 가로 통로 두 줄
    const gaps = [Math.floor(MH / 3), Math.floor((MH * 2) / 3)];
    for (let bx = 2; bx <= MW - 4; bx += 4) {
      for (let y = 2; y < MH - 2; y++) {
        if (gaps.includes(y)) continue;
        g[y][bx] = 1;
        g[y][bx + 1] = 1;
      }
    }
  } else if (ch.kind === "boss") {
    for (const [px, py] of [[3, 5], [MW - 5, 5], [3, MH - 7], [MW - 5, MH - 7]]) {
      g[py][px] = 1;
      g[py][px + 1] = 1;
      g[py + 1][px] = 1;
      g[py + 1][px + 1] = 1;
    }
  } else {
    let placed = 0;
    let tries = 0;
    while (placed < 18 && tries++ < 600) {
      const x = Math.floor(rnd(2, MW - 3));
      const y = Math.floor(rnd(2, MH - 3));
      if (g[y][x]) continue;
      if (y > MH - 7 && Math.abs(x - Math.floor(MW / 2)) < 3) continue; // 시작 지점 확보
      g[y][x] = 1;
      placed++;
    }
  }
  return g;
}

export const solid = (g: Grid, tx: number, ty: number): boolean =>
  tx < 0 || ty < 0 || tx >= MW || ty >= MH ? true : g[ty][tx] === 1;

/** 지정한 타일에서 가장 가까운 빈 칸의 월드 좌표 */
export function nearestFree(g: Grid, tx: number, ty: number): Vec {
  for (let r = 0; r < Math.max(MW, MH); r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = tx + dx;
        const y = ty + dy;
        if (x < 1 || y < 1 || x >= MW - 1 || y >= MH - 1) continue;
        if (!g[y][x]) return { x: x * TS + TS / 2, y: y * TS + TS / 2 };
      }
    }
  }
  return { x: W / 2, y: AH / 2 };
}

export function freeSpots(g: Grid, away: Vec | null, minD: number): Vec[] {
  const out: Vec[] = [];
  for (let y = 1; y < MH - 1; y++) {
    for (let x = 1; x < MW - 1; x++) {
      if (g[y][x]) continue;
      const p = { x: x * TS + TS / 2, y: y * TS + TS / 2 };
      if (away && dist(p, away) < minD) continue;
      out.push(p);
    }
  }
  return out;
}

/** 축을 분리해 이동시키고 벽에서 밀어낸다 */
export function moveEnt(e: Body, dx: number, dy: number, g: Grid): void {
  e.x += dx;
  resolveAxis(e, g, true);
  e.y += dy;
  resolveAxis(e, g, false);
}

function resolveAxis(e: Body, g: Grid, horizontal: boolean): void {
  const r = e.r;
  const minX = Math.floor((e.x - r) / TS);
  const maxX = Math.floor((e.x + r) / TS);
  const minY = Math.floor((e.y - r) / TS);
  const maxY = Math.floor((e.y + r) / TS);
  for (let ty = minY; ty <= maxY; ty++) {
    for (let tx = minX; tx <= maxX; tx++) {
      if (!solid(g, tx, ty)) continue;
      const L = tx * TS;
      const T = ty * TS;
      const R = L + TS;
      const B = T + TS;
      if (e.x + r <= L || e.x - r >= R || e.y + r <= T || e.y - r >= B) continue;
      if (horizontal) e.x = e.x < L + TS / 2 ? L - r : R + r;
      else e.y = e.y < T + TS / 2 ? T - r : B + r;
    }
  }
}
