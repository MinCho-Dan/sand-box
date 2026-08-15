import { AH, MH, MW, TS, W } from "../config";
import { CHAPTERS, endlessChapter, FIRST_TOOL_CHAPTER, type Chapter } from "../data/chapters";
import { ENEMY_DEF } from "../data/enemies";
import { BATT_DROP, BATT_MAX, WEAPONS } from "../data/weapons";
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
    mode: "story",
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
    spawn0: 0,
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
  // 원래 1.5 였다 — 허기가 사실상 무료라 시간 압박이 없다는 피드백을 받고 올렸다
  foodRate: () => 1.9 * (1 - 0.1 * state.up.food),
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

/** 스토리 모드는 고정 목록(CHAPTERS)을, 무한모드는 파도 번호로 즉석에서 계산한다. */
export function currentChapter(i: number): Chapter {
  return state.mode === "endless" ? endlessChapter(i) : CHAPTERS[i];
}

/** HUD·카드·상점에 쓰는 "STAGE n / 8" 또는 "ROUND n" 표기 */
export function chapterLabel(i: number): string {
  return state.mode === "endless" ? `ROUND ${i + 1}` : `STAGE ${i + 1} / ${CHAPTERS.length}`;
}

export function beginChapter(): void {
  const i = state.pendingChapter;
  const ch = currentChapter(i);
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
    // 배회하는 잡몹 — 완료 조건(보급품 수)에는 영향을 주지 않는다
    for (const [type, n] of Object.entries(ch.ambient ?? {})) {
      for (let k = 0; k < (n as number); k++) {
        const t = take();
        state.enemies.push(makeEnemy(type as EnemyType, t.x, t.y));
      }
    }
  } else if (ch.kind === "boss") {
    const t = nearestFree(state.map, Math.floor(MW / 2), 5);
    state.enemies.push(makeEnemy("boss", t.x, t.y));
    // 마왕성 입구 보급 — 앞 스테이지에서 배터리를 다 쓰고 도착하면
    // 렌치로 보스를 깎아야 해서 순수한 지구력 싸움이 된다. 그건 어려운 게 아니라 지겹다.
    for (const s of [take(), take()]) {
      state.items.push({ x: s.x, y: s.y, r: 10, type: "batt", val: BATT_DROP, t: 0 });
    }
    if (!state.tool) {
      const s = take();
      state.items.push({ x: s.x, y: s.y, r: 12, type: "tool", tool: "saw" as ToolId, t: 0 });
    }
  } else {
    // 무한모드는 파도가 오를수록 개체 자체도 더 단단하고 빠르고 세게 때리게 만든다 —
    // 상한 없이 계속 오른다. 체력만 올리면 딜은 그대로인데 받는 피해는 안 느니
    // 업그레이드로 체력을 충분히 쌓은 뒤로는 사실상 안 죽는 문제가 있었다.
    // 언젠가는 죽는 게 무한모드의 요점이라, 세 축(체력·속도·피해) 다 인위적인 천장을 두지 않는다.
    const hpMult = state.mode === "endless" ? 1 + i * 0.05 : 1;
    const spdMult = state.mode === "endless" ? 1 + i * 0.02 : 1;
    const dmgMult = state.mode === "endless" ? 1 + i * 0.03 : 1;
    for (const [type, n] of Object.entries(ch.spawn ?? {})) {
      for (let k = 0; k < (n as number); k++) {
        const t = take();
        const e = makeEnemy(type as EnemyType, t.x, t.y);
        if (hpMult !== 1) {
          e.hp = Math.round(e.hp * hpMult);
          e.maxhp = e.hp;
        }
        e.spd *= spdMult;
        if (dmgMult !== 1) e.dmgMult = dmgMult;
        state.enemies.push(e);
      }
    }
  }

  // 광산에서 첫 전동공구를 확정 지급한다 (이후로는 적이 확률로 떨어뜨린다)
  if (i === FIRST_TOOL_CHAPTER && !state.tool) {
    const t = take();
    state.items.push({ x: t.x, y: t.y, r: 12, type: "tool", tool: "driver" as ToolId, t: 0 });
  }

  state.spawn0 = state.enemies.length;
  setScene("play", 0.2);
}

/** 현재 스테이지 안에서의 진행도 0~1.
 *  분열체가 늘어나면 1을 넘길 수 있어 clamp 한다. */
export function stageProgress(): number {
  const ch = currentChapter(state.chapterIdx);
  if (!ch) return 0;
  if (state.portal) return 1;
  if (ch.kind === "scavenge") return clamp(state.player.supplies / (ch.need || 1), 0, 1);
  if (ch.kind === "boss") {
    const b = state.enemies.find((e) => e.type === "boss");
    return b ? clamp(1 - b.hp / b.maxhp, 0, 1) : 1;
  }
  return state.spawn0 ? clamp(1 - state.enemies.length / state.spawn0, 0, 1) : 0;
}

/** 카드에 띄울 신규 적 목록 */
export function newEnemiesFor(i: number): EnemyType[] {
  const ch = currentChapter(i);
  const types: EnemyType[] = ch.kind === "boss" ? ["boss"] : (Object.keys({ ...ch.spawn, ...ch.ambient }) as EnemyType[]);
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
  // 무한모드에서 새로 등장하는 적이 없는 파도는 카드를 건너뛴다 —
  // 매번 3.6초씩 멈추면 "무한히" 도는 느낌이 죽는다
  if (state.mode === "endless" && newEnemiesFor(state.pendingChapter).length === 0) {
    markSeen(state.pendingChapter);
    beginChapter();
    return;
  }
  state.cardT = 0;
  setScene("card", 0.7);
}

/** 무한모드 시작 — 스테이지 진행 없이 곧장 1라운드로 들어간다 */
export function startEndless(): void {
  newGame();
  state.mode = "endless";
  state.pendingChapter = 0;
  beginChapter();
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
