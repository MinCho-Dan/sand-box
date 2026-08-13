/** 밸런스 측정용 헤드리스 시뮬레이터.
 *
 *   npx vite-node scripts/balance.ts -- 30
 *
 * 실제 update 루프를 그대로 돌리고, 입력만 봇이 넣는다.
 * 봇은 "적당히 잘 하는 사람" 수준을 노린다 — 완벽한 봇으로 재면
 * 사람이 못 넘는 구간을 놓치고, 너무 못하는 봇으로 재면 전부 어렵게 나온다.
 * 그래서 조준·회피에 지연과 오차를 넣었다.
 *
 * 숫자를 고칠 때는 이 스크립트를 돌려 클리어율·소요 시간·체력 손실을 보고 판단한다. */
import { CHAPTERS } from "../src/data/chapters";
import { BATT_MAX } from "../src/data/weapons";
import { UPGRADES } from "../src/data/upgrades";
import { input, touch } from "../src/core/inputState";
import * as S from "../src/core/state";
import { update } from "../src/systems/update";
import { buyUpgrade, canBuy } from "../src/systems/shop";
import { handleAdvance } from "../src/systems/ui";
import { MH, MW, TS } from "../src/config";
import { solid } from "../src/core/map";
import { dist } from "../src/core/util";
import type { Body, Grid, Vec } from "../src/types";

Object.assign(globalThis, {
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} },
});

const DT = 1 / 60;
/** 한 스테이지에서 이만큼을 넘기면 못 깬 것으로 본다 */
const STAGE_TIMEOUT = 180;

interface StageStat {
  time: number;
  hpLost: number;
  swings: number;
  battUsed: number;
  gems: number;
  died: boolean;
  timeout: boolean;
}

/** 타일 격자 위 BFS. 게임 본편에는 길찾기가 없다 — 사람이 하는 일이라 필요 없고,
 *  봇만 이걸 쓴다. 없으면 마트 선반 사이에서 벽에 붙어 굶어 죽는다. */
function nextStep(g: Grid, from: Vec, to: Vec): Vec | null {
  const sx = Math.floor(from.x / TS);
  const sy = Math.floor(from.y / TS);
  const tx = Math.floor(to.x / TS);
  const ty = Math.floor(to.y / TS);
  if (sx === tx && sy === ty) return to;
  if (solid(g, sx, sy)) return to;

  const start = sy * MW + sx;
  const goal = ty * MW + tx;
  const prev = new Int32Array(MW * MH).fill(-1);
  prev[start] = -2;
  const q = [start];
  let found = -1;

  for (let head = 0; head < q.length && found < 0; head++) {
    const cur = q[head];
    const cx = cur % MW;
    const cy = (cur - cx) / MW;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (solid(g, nx, ny)) continue;
      const ni = ny * MW + nx;
      if (prev[ni] !== -1) continue;
      prev[ni] = cur;
      if (ni === goal) {
        found = ni;
        break;
      }
      q.push(ni);
    }
  }
  if (found < 0) return null;

  let cur = found;
  while (prev[cur] !== start && prev[cur] >= 0) cur = prev[cur];
  const cx = cur % MW;
  const cy = (cur - cx) / MW;
  return { x: cx * TS + TS / 2, y: cy * TS + TS / 2 };
}

const near = (from: Body, list: Body[]): Body | null => {
  let best: Body | null = null;
  let bd = Infinity;
  for (const e of list) {
    const d = dist(from, e);
    if (d < bd) {
      bd = d;
      best = e;
    }
  }
  return best;
};

/** 봇의 한 프레임. 이동은 아날로그 스틱(touch)으로, 공격·회피는 엣지 입력으로 넣는다. */
interface Brain {
  dodgeCd: number;
  pathT: number;
  way: Vec | null;
}

function bot(reaction: Brain): void {
  const st = S.state;
  const p = st.player;
  const ch = CHAPTERS[st.chapterIdx];

  // 1) 목표 정하기 — 포털 > 눈앞의 회복/배터리 > 스테이지 목표
  let target: Body | null = st.portal;
  if (!target) {
    const grab = st.items.filter(
      (i) =>
        i.type === "supply" ||
        i.type === "tool" ||
        ((i.type === "food" || i.type === "medkit" || i.type === "batt" || i.type === "gem") && dist(p, i) < 190),
    );
    const want = near(p, grab);
    if (ch.kind === "scavenge") target = want ?? near(p, st.items);
    else target = want && dist(p, want) < 110 ? want : (near(p, st.enemies) ?? want);
  }

  let dx = 0;
  let dy = 0;
  if (target) {
    const d = dist(p, target);
    const isEnemy = st.enemies.includes(target as never);
    // 적한테는 사거리 안쪽까지만 붙는다 (붙어 있으면 접촉 피해를 계속 맞는다)
    const keep = isEnemy ? S.stat.reach() * 0.75 : 0;
    if (d <= keep) {
      dx = -((target.x - p.x) / (d || 1)) * 0.6;
      dy = -((target.y - p.y) / (d || 1)) * 0.6;
    } else {
      // 벽 뒤에 있는 목표로 직선 이동하면 그대로 낀다 — 길을 찾아 간다
      reaction.pathT -= DT;
      if (reaction.pathT <= 0 || !reaction.way || dist(p, reaction.way) < 10) {
        reaction.way = nextStep(st.map, p, target) ?? target;
        reaction.pathT = 0.2;
      }
      const w = reaction.way;
      const wd = dist(p, w) || 1;
      dx = (w.x - p.x) / wd;
      dy = (w.y - p.y) / wd;
    }
  }

  // 2) 위험 회피 — 돌진 예고선과 날아오는 탄막
  reaction.dodgeCd -= DT;
  let danger = false;
  for (const e of st.enemies) {
    if (e.mode === 1 && dist(p, e) < 260) danger = true;
  }
  for (const b of st.bullets) {
    if (dist(p, b) < 70) danger = true;
  }
  if (danger && reaction.dodgeCd <= 0 && p.dashCd <= 0 && p.hunger > 12) {
    // 위협에서 옆으로 빠진다
    const t = near(p, st.bullets.length ? st.bullets : st.enemies);
    if (t) {
      const a = Math.atan2(t.y - p.y, t.x - p.x) + Math.PI / 2;
      dx = Math.cos(a);
      dy = Math.sin(a);
    }
    touch.dash = true;
    reaction.dodgeCd = 0.5;
  }

  touch.active = true;
  touch.x = dx;
  touch.y = dy;

  // 3) 공격 — 사거리에 들어오면 친다
  const e = near(p, st.enemies);
  if (e && p.atkCd <= 0 && dist(p, e) < S.stat.reach() + e.r) input.attackEdge = true;
}

function playStage(): StageStat {
  const st = S.state;
  const hp0 = st.player.hp;
  const gem0 = st.gems;
  const reaction: Brain = { dodgeCd: 0, pathT: 0, way: null };
  let t = 0;
  let swings = 0;
  let battUsed = 0;

  while (st.scene === "play" && t < STAGE_TIMEOUT) {
    const b0 = st.battery;
    const cd0 = st.player.atkCd;
    bot(reaction);
    update(DT);
    if (st.player.atkCd > cd0) swings++;
    if (st.battery < b0) battUsed += b0 - st.battery;
    t += DT;
  }

  return {
    time: t,
    hpLost: hp0 - st.player.hp,
    swings,
    battUsed,
    gems: st.gems - gem0,
    died: st.scene === "dead",
    timeout: t >= STAGE_TIMEOUT,
  };
}

/** 상점: 싼 것부터 살 수 있는 만큼 산다 */
function shop(): void {
  for (let guard = 0; guard < 40; guard++) {
    const buyable = UPGRADES.filter((u) => canBuy(u.id));
    if (!buyable.length) break;
    if (!buyUpgrade(buyable[0].id)) break;
  }
}

function playRun(): StageStat[] {
  S.newGame();
  const out: StageStat[] = [];
  for (let i = 0; i < CHAPTERS.length; i++) {
    S.state.pendingChapter = i;
    S.beginChapter();
    S.state.sceneLock = 0;
    const r = playStage();
    out.push(r);
    if (r.died || r.timeout) break;
    // 포털을 밟으면 story(1스테이지) 나 shop 으로 넘어간다 — 다음 스테이지 직전까지 진행시킨다
    if (S.state.scene === "story") handleAdvance();
    shop();
  }
  return out;
}

const runs = Number(process.argv[2]) || 20;
const per: StageStat[][] = CHAPTERS.map(() => []);
let cleared = 0;

for (let n = 0; n < runs; n++) {
  const r = playRun();
  r.forEach((s, i) => per[i].push(s));
  if (r.length === CHAPTERS.length && !r[r.length - 1].died && !r[r.length - 1].timeout) cleared++;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pad = (s: string | number, n: number) => String(s).padStart(n);

console.log(`\n${runs}회 플레이 · 완주 ${cleared}회 (${((cleared / runs) * 100).toFixed(0)}%)\n`);
console.log("스테이지            도달  시간   피해  스윙  배터리  마정석  사망");
CHAPTERS.forEach((ch, i) => {
  const xs = per[i];
  if (!xs.length) {
    console.log(`${(i + 1 + " " + ch.name).padEnd(20)}${pad(0, 4)}`);
    return;
  }
  const deaths = xs.filter((s) => s.died || s.timeout).length;
  console.log(
    `${(i + 1 + " " + ch.name).padEnd(20)}` +
      `${pad(xs.length, 4)}` +
      `${pad(avg(xs.map((s) => s.time)).toFixed(1), 6)}s` +
      `${pad(avg(xs.map((s) => s.hpLost)).toFixed(0), 6)}` +
      `${pad(avg(xs.map((s) => s.swings)).toFixed(0), 6)}` +
      `${pad(avg(xs.map((s) => s.battUsed)).toFixed(0), 8)}` +
      `${pad(avg(xs.map((s) => s.gems)).toFixed(0), 8)}` +
      `${pad(deaths, 6)}`,
  );
});
console.log(`\n배터리 완충 = ${BATT_MAX}`);
