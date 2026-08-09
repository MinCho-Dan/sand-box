import { AH, MH, MW, TS, W } from "../config";
import { CHAPTERS, FIRST_TOOL_CHAPTER } from "../data/chapters";
import { ENEMY_DEF } from "../data/enemies";
import { BATT_MAX, WEAPONS } from "../data/weapons";
import type { Enemy, EnemyType, GameState, Player, Scene, ToolId } from "../types";
import { clearPendingInput } from "./inputState";
import { freeSpots, makeMap, nearestFree } from "./map";
import { getBest, setBest } from "./save";
import { clamp, rnd } from "./util";

/** 유일한 재할당 지점이 newGame 이라 모듈 밖에서는 라이브 바인딩으로 읽기만 한다 */
export let state: GameState = blankState();

function blankPlayer(): Player {
  return {
    x: W / 2,
    y: AH - 5 * TS,
    r: 12,
    face: -Math.PI / 2,
    hp: 100,
    hunger: 100,
    atkCd: 0,
    swing: 0,
    dashCd: 0,
    dashT: 0,
    dvx: 0,
    dvy: 0,
    inv: 0,
    hurtT: 0,
    supplies: 0,
  };
}

function blankState(): GameState {
  return {
    scene: "title",
    sceneLock: 0,
    time: 0,
    runTime: 0,
    seqT: 0,
    cardT: 0,
    storyIdx: 0,
    shake: 0,
    flash: 0,
    fade: 0,
    chapterIdx: 0,
    pendingChapter: 0,
    kills: 0,
    score: 0,
    sc: { kills: 0, items: 0, time: 0 },
    gems: 0,
    up: { hp: 0, food: 0, atk: 0, spd: 0, dash: 0 },
    tool: null,
    battery: 0,
    seen: new Set<EnemyType>(),
    player: blankPlayer(),
    map: [],
    enemies: [],
    items: [],
    bullets: [],
    parts: [],
    portal: null,
    toast: "",
    toastT: 0,
    saved: false,
    submitted: false,
  };
}

export function newGame(): void {
  state = blankState();
  state.player.hp = stat.maxhp();
  state.player.hunger = stat.maxfood();
}

export const curWeapon = () => WEAPONS[state.tool ?? "wrench"];

/** 업그레이드와 장착 무기가 반영된 능력치 */
export const stat = {
  maxhp: () => 100 + 20 * state.up.hp,
  maxfood: () => 100 + 20 * state.up.food,
  foodRate: () => 1.5 * (1 - 0.1 * state.up.food),
  dmg: () => curWeapon().dmg + 4 * state.up.atk,
  atkCd: () => Math.max(0.12, curWeapon().cd - 0.04 * state.up.spd),
  reach: () => curWeapon().reach,
  arc: () => curWeapon().arc,
  dashCd: () => 0.85 - 0.1 * state.up.dash,
  dashInv: () => 0.22 + 0.03 * state.up.dash,
  /** 회피 1회가 소모하는 허기 */
  dashFood: () => Math.max(1.5, 4 - 0.5 * state.up.dash),
};

/** 씬 전환 시 짧은 입력 잠금을 걸고 대기 중인 입력을 버린다.
 *  보스를 잡으려고 연타하던 손가락이 엔딩을 그대로 넘겨버리거나,
 *  상점에서 원치 않는 업그레이드가 결제되는 것을 막는다. */
export function setScene(s: Scene, lock = 0.6): void {
  state.scene = s;
  state.sceneLock = lock;
  state.seqT = 0;
  clearPendingInput();
}

export function toast(msg: string): void {
  state.toast = msg;
  state.toastT = 3.0;
}

export function makeEnemy(type: EnemyType, x: number, y: number): Enemy {
  const d = ENEMY_DEF[type];
  return {
    type, x, y,
    r: d.r,
    hp: d.hp,
    maxhp: d.hp,
    spd: d.spd,
    hit: 0,
    cd: rnd(1, 2.5),
    touch: 0,
    phase: 0,
    wob: rnd(0, 6),
    mode: 0,
    windT: 0,
    rushT: 0,
    aim: 0,
  };
}

export function beginChapter(): void {
  const i = state.pendingChapter;
  const ch = CHAPTERS[i];
  state.chapterIdx = i;
  state.map = makeMap(ch);
  state.enemies = [];
  state.items = [];
  state.bullets = [];
  state.parts = [];
  state.portal = null;
  state.fade = 1;

  const p = state.player;
  const s = nearestFree(state.map, Math.floor(MW / 2), MH - 4);
  p.x = s.x;
  p.y = s.y;
  p.hp = Math.min(p.hp, stat.maxhp());
  p.dashT = 0;
  p.swing = 0;
  p.inv = 0.7;

  const spots = freeSpots(state.map, p, 230);
  const take = () =>
    spots.length
      ? spots.splice(Math.floor(Math.random() * spots.length), 1)[0]
      : nearestFree(state.map, Math.floor(MW / 2), 3);

  if (ch.kind === "scavenge") {
    p.supplies = 0;
    const kinds = ["통조림", "생수", "라면", "건빵", "통조림", "생수"];
    for (let k = 0; k < (ch.need ?? 0); k++) {
      const t = take();
      state.items.push({ x: t.x, y: t.y, r: 11, type: "supply", label: kinds[k % kinds.length], t: rnd(0, 6) });
    }
  } else if (ch.kind === "boss") {
    const t = nearestFree(state.map, Math.floor(MW / 2), 5);
    state.enemies.push(makeEnemy("boss", t.x, t.y));
  } else {
    for (const [type, n] of Object.entries(ch.spawn ?? {})) {
      for (let k = 0; k < (n as number); k++) {
        const t = take();
        state.enemies.push(makeEnemy(type as EnemyType, t.x, t.y));
      }
    }
  }

  // 광산에서 첫 전동공구를 확정 지급한다 (이후로는 적이 확률로 떨어뜨린다)
  if (i === FIRST_TOOL_CHAPTER && !state.tool) {
    const t = take();
    state.items.push({ x: t.x, y: t.y, r: 12, type: "tool", tool: "driver" as ToolId, t: 0 });
  }

  setScene("play", 0.2);
}

/** 카드에 띄울 신규 적 목록 */
export function newEnemiesFor(i: number): EnemyType[] {
  const ch = CHAPTERS[i];
  const types: EnemyType[] = ch.kind === "boss" ? ["boss"] : (Object.keys(ch.spawn ?? {}) as EnemyType[]);
  return types.filter((t) => !state.seen.has(t));
}
export function markSeen(i: number): void {
  for (const t of newEnemiesFor(i)) state.seen.add(t);
}

export function gotoShop(next: number): void {
  state.pendingChapter = next;
  setScene("shop", 0.8);
}
export function gotoCard(): void {
  state.cardT = 0;
  setScene("card", 0.7);
}

export function equipTool(tool: ToolId): void {
  state.tool = tool;
  if (state.battery <= 0) state.battery = clamp(40, 0, BATT_MAX);
}

/** 클리어 시간 보너스: 3000 에서 시작해 10초마다 100 씩 깎인다 */
export const timeBonus = (runTime: number) => Math.max(0, 3000 - Math.floor(runTime * 10));

export function finishRun(scene: "dead" | "ending"): void {
  if (scene === "ending") {
    state.sc.time = timeBonus(state.runTime);
    state.score += state.sc.time;
  }
  if (!state.saved) {
    state.saved = true;
    if (state.score > getBest()) setBest(state.score);
  }
  setScene(scene, 1.2);
}
