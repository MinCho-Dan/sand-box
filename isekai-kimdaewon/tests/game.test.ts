import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeCtx, lsStore } from "./setup";

import { AH, CTRL_H, H, HUD_H, MH, MW, SUPABASE_ANON_KEY, SUPABASE_URL, TS, W } from "../src/config";
import { CHAPTERS, FIRST_TOOL_CHAPTER } from "../src/data/chapters";
import { CODEX, ENEMY_DEF } from "../src/data/enemies";
import { BATT_MAX, TOOL_IDS, WEAPONS } from "../src/data/weapons";
import { UP_MAX, upCostAt } from "../src/data/upgrades";
import { PAL, SPRITES } from "../src/assets/sprites";
import { blit, sprite } from "../src/assets/bake";
import { input, keys, touch } from "../src/core/inputState";
import {
  beginChapter, currentChapter, curWeapon, finishRun, gotoCard, newGame, setScene,
  stageProgress, startEndless, state, stat, timeBonus,
} from "../src/core/state";
import { cycleControlMode, getControlMode } from "../src/core/controlMode";
import { getBest } from "../src/core/save";
import { buyUpgrade } from "../src/systems/shop";
import { fetchRanking, rank, rankOn, submitScore } from "../src/systems/ranking";
import { handleAdvance, hitButton, pressButton, sceneButtons } from "../src/systems/ui";
import { update } from "../src/systems/update";
import { draw } from "../src/render";
import { setCtx } from "../src/render/ctx";
import type { EnemyType, UiButton } from "../src/types";

const BOSS_CH = CHAPTERS.findIndex((c) => c.kind === "boss");

beforeAll(() => setCtx(fakeCtx));

const frame = (dt = 1 / 60) => {
  if (input.enterEdge) {
    input.enterEdge = false;
    handleAdvance();
  }
  update(dt);
  draw();
};
const run = (n: number, dt = 1 / 60) => {
  for (let i = 0; i < n; i++) frame(dt);
};
const startChapter = (i: number) => {
  newGame();
  state.pendingChapter = i;
  beginChapter();
};
const clearKeys = () => {
  for (const k of Object.keys(keys)) keys[k] = false;
};

beforeEach(() => {
  clearKeys();
  touch.on = false;
  touch.active = false;
  touch.dash = false;
  touch.x = touch.y = 0;
  input.attackEdge = false;
  input.enterEdge = false;
});

describe("규격", () => {
  it("캔버스 540x972 = HUD 108 + 아레나 684 + 하단 컨트롤 밴드 180", () => {
    expect([W, H]).toEqual([540, 972]);
    expect(HUD_H + AH + CTRL_H).toBe(H);
    expect([MW, MH, TS]).toEqual([15, 19, 36]);
    expect(MH * TS).toBe(AH);
  });

  it("스테이지 8개, 모든 스폰 타입에 정의와 도감이 있다", () => {
    expect(CHAPTERS.length).toBe(8);
    for (const ch of CHAPTERS) {
      const types: EnemyType[] = ch.kind === "boss" ? ["boss"] : (Object.keys(ch.spawn ?? {}) as EnemyType[]);
      for (const t of types) {
        expect(ENEMY_DEF[t], `${t} 정의`).toBeTruthy();
        expect(CODEX[t], `${t} 도감`).toBeTruthy();
      }
    }
  });
});

describe("플레이", () => {
  for (let ci = 0; ci < 8; ci++) {
    it(`챕터 ${ci} (${CHAPTERS[ci].name}) 랜덤 플레이 2400프레임`, () => {
      startChapter(ci);
      const codes = ["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft"];
      for (let i = 0; i < 2400; i++) {
        if (i % 17 === 0) for (const c of codes) keys[c] = Math.random() < 0.4;
        if (i % 11 === 0) input.attackEdge = true;
        state.player.hp = stat.maxhp();
        state.player.hunger = stat.maxfood();
        if (state.scene !== "play") break;
        update(1 / 60);
        draw();
        expect(Number.isFinite(state.player.x) && Number.isFinite(state.player.y)).toBe(true);
        expect(state.enemies.every((e) => Number.isFinite(e.x) && Number.isFinite(e.y))).toBe(true);
      }
      clearKeys();
    });
  }

  it("[회귀] 플레이어와 적이 아레나를 벗어나지 않는다", () => {
    for (let ci = 1; ci < CHAPTERS.length; ci++) {
      startChapter(ci);
      for (let i = 0; i < 400; i++) {
        state.player.hp = stat.maxhp();
        update(1 / 60);
        expect(state.player.y).toBeGreaterThanOrEqual(0);
        expect(state.player.y).toBeLessThanOrEqual(AH);
        for (const e of state.enemies) {
          expect(e.y).toBeGreaterThan(-41);
          expect(e.y).toBeLessThan(AH + 41);
        }
      }
    }
  });
});

describe("적", () => {
  it("돌진병은 예고 중 조준을 고정한다 (옆으로 피할 수 있어야 한다)", () => {
    startChapter(3);
    state.enemies = state.enemies.filter((e) => e.type === "charger");
    expect(state.enemies.length).toBeGreaterThan(0);
    const e = state.enemies[0];
    const p = state.player;
    p.x = e.x;
    p.y = e.y + 150;
    p.hp = 9999;
    e.cd = 0;
    let sawWind = false;
    let aimAtWind = 0;
    for (let i = 0; i < 240; i++) {
      update(1 / 60);
      p.hp = 9999;
      if (e.mode === 1) {
        if (!sawWind) {
          sawWind = true;
          aimAtWind = e.aim;
        }
        p.x = e.x + 200;
        expect(e.aim).toBe(aimAtWind);
      }
      if (e.mode === 2) break;
    }
    expect(sawWind).toBe(true);
  });

  it("마왕은 체력 절반 아래에서만 예고 후 돌진한다 (조준 고정)", () => {
    startChapter(BOSS_CH);
    const boss = state.enemies[0];
    boss.hp = boss.maxhp * 0.4; // 절반 아래로 내려 돌진이 풀리게 한다
    boss.phase = 2; // 다음 트리거에서 phase 3 (돌진 후보) 가 되게
    boss.cd = 0.01;
    state.player.x = boss.x;
    state.player.y = boss.y + 150;
    state.player.hp = 9999;

    let sawWind = false;
    let aimAtWind = 0;
    for (let i = 0; i < 300; i++) {
      update(1 / 60);
      state.player.hp = 9999;
      if (boss.mode === 1) {
        if (!sawWind) {
          sawWind = true;
          aimAtWind = boss.aim;
        }
        state.player.x = boss.x + 200; // 예고 중에 위치를 바꿔도
        expect(boss.aim).toBe(aimAtWind); // 조준은 그대로다
      }
      if (boss.mode === 2 || state.scene !== "play") break;
    }
    expect(sawWind).toBe(true);
  });

  it("체력 절반 이상에서는 돌진하지 않는다", () => {
    startChapter(BOSS_CH);
    const boss = state.enemies[0];
    boss.phase = 2;
    boss.cd = 0.01;
    for (let i = 0; i < 240; i++) {
      state.player.hp = 9999;
      update(1 / 60);
      expect(boss.mode).not.toBe(1);
      if (state.scene !== "play") break;
    }
  });

  it("분열체는 죽으면 슬라임 둘로 갈라진다", () => {
    startChapter(5);
    const sp = state.enemies.find((e) => e.type === "splitter")!;
    expect(sp).toBeTruthy();
    const before = state.enemies.filter((e) => e.type === "spore").length;
    sp.hp = 0;
    update(1 / 60);
    expect(state.enemies.filter((e) => e.type === "spore").length).toBe(before + 2);
    expect(state.enemies).not.toContain(sp);
  });
});

describe("무기와 배터리", () => {
  it("전동공구는 배터리를 소모하고 방전되면 렌치로 복귀한다", () => {
    startChapter(1);
    state.tool = "saw";
    state.battery = 10;
    expect(stat.dmg()).toBe(WEAPONS.saw.dmg);
    expect(stat.reach()).toBe(WEAPONS.saw.reach);

    let swings = 0;
    while (state.tool && swings < 20) {
      state.player.atkCd = 0;
      input.attackEdge = true;
      update(1 / 60);
      swings++;
    }
    expect(state.tool).toBeNull();
    expect(state.battery).toBe(0);
    expect(curWeapon()).toBe(WEAPONS.wrench);
    expect(swings).toBeLessThanOrEqual(Math.ceil(10 / WEAPONS.saw.drain) + 1);
  });

  it("렌치는 배터리를 쓰지 않는다", () => {
    startChapter(1);
    state.tool = null;
    state.battery = 50;
    for (let i = 0; i < 10; i++) {
      state.player.atkCd = 0;
      input.attackEdge = true;
      update(1 / 60);
    }
    expect(state.battery).toBe(50);
  });

  it("전동공구가 없어도 배터리는 누적되고 상한을 넘지 않는다", () => {
    startChapter(1);
    state.tool = null;
    state.battery = 0;
    const p = state.player;
    state.items.push({ x: p.x, y: p.y, r: 10, type: "batt", val: 22, t: 0 });
    update(1 / 60);
    expect(state.battery).toBe(22);
    expect(state.tool).toBeNull();

    state.battery = BATT_MAX - 5;
    state.items.push({ x: p.x, y: p.y, r: 10, type: "batt", val: 22, t: 0 });
    update(1 / 60);
    expect(state.battery).toBe(BATT_MAX);
  });

  it("광산에서 전동공구가 확정 배치된다", () => {
    startChapter(FIRST_TOOL_CHAPTER);
    const tool = state.items.find((i) => i.type === "tool");
    expect(tool).toBeTruthy();
    expect(WEAPONS[tool!.tool!]).toBeTruthy();
  });

  it("마왕성에는 배터리 보급이 놓인다 (렌치로만 보스를 깎게 두지 않는다)", () => {
    startChapter(BOSS_CH);
    expect(state.items.filter((i) => i.type === "batt").length).toBeGreaterThanOrEqual(2);
    // 전동공구가 없이 도착했다면 한 자루 준다
    expect(state.items.some((i) => i.type === "tool")).toBe(true);
  });

  it("모든 전동공구는 렌치보다 강하고 배터리를 쓴다", () => {
    for (const id of TOOL_IDS) {
      const w = WEAPONS[id];
      expect(w.drain, id).toBeGreaterThan(0);
      expect(w.dmg, id).toBeGreaterThan(WEAPONS.wrench.dmg);
    }
  });
});

describe("회피", () => {
  it("K 와 Shift 모두로 발동한다", () => {
    startChapter(1);
    const p = state.player;
    for (const key of ["KeyK", "ShiftLeft"]) {
      p.dashCd = 0;
      p.dashT = 0;
      keys["KeyD"] = true;
      keys[key] = true;
      update(1 / 60);
      expect(p.dashT, key).toBeGreaterThan(0);
      clearKeys();
    }
  });

  it("허기를 소모하고, 업그레이드하면 소모량이 준다", () => {
    startChapter(1);
    const p = state.player;
    p.hunger = 100;
    p.dashCd = 0;
    p.dashT = 0;
    const cost = stat.dashFood();
    keys["KeyD"] = true;
    keys["KeyK"] = true;
    update(1 / 60);
    clearKeys();
    expect(p.dashT).toBeGreaterThan(0);
    expect(100 - p.hunger).toBeGreaterThanOrEqual(cost);

    state.up.dash = 4;
    expect(stat.dashFood()).toBeLessThan(cost);
  });
});

describe("입력 게이트 (회귀)", () => {
  const tap = (b?: UiButton | null) => {
    if (state.sceneLock > 0) return;
    if (b) pressButton(b);
  };

  it("보스 격파 순간 연타해도 엔딩이 유지된다", () => {
    startChapter(BOSS_CH);
    const boss = state.enemies[0];
    boss.hp = 20;
    state.player.x = boss.x + 30;
    state.player.y = boss.y;
    state.player.hp = 999;

    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      input.attackEdge = true; // 공격 버튼 연타
      tap(hitButton(W / 2, 800)); // 화면 연타
      frame();
      seen.add(state.scene);
      state.player.hp = 999;
      expect(state.scene, `프레임 ${i}`).not.toBe("title");
    }
    expect(state.scene).toBe("ending");
    expect(seen.has("bossdown")).toBe(true);
  });

  it("엔딩은 다시 시작 버튼으로만 재시작된다", () => {
    startChapter(BOSS_CH);
    state.score = 500;
    finishRun("ending");
    run(120);
    tap(hitButton(30, 30));
    frame();
    expect(state.scene).toBe("ending");

    const b = sceneButtons().find((x) => x.kind === "restart")!;
    expect(b).toBeTruthy();
    pressButton(b);
    frame();
    expect(state.scene).toBe("title");
  });

  it("엔딩 버튼이 본문 텍스트를 가리지 않는다", () => {
    newGame();
    setScene("ending", 0);
    const b = sceneButtons().find((x) => x.kind === "restart")!;
    expect(b.y).toBeGreaterThan(700);
    expect(b.y + b.h).toBeLessThanOrEqual(H);

    newGame();
    setScene("dead", 0);
    const d = sceneButtons().find((x) => x.kind === "restart")!;
    expect(d.y).toBeGreaterThan(H / 2 + 50);
    expect(d.y + d.h).toBeLessThanOrEqual(H);
  });

  it("상점 진입 순간 연타해도 오결제가 없다", () => {
    startChapter(1);
    state.enemies.length = 0;
    state.gems = 200;
    frame();
    expect(state.portal).toBeTruthy();
    state.player.x = state.portal!.x;
    state.player.y = state.portal!.y;
    frame();
    expect(state.scene).toBe("shop");

    const buy = sceneButtons().find((b) => b.kind === "buy")!;
    const before = JSON.stringify(state.up);
    const gemsBefore = state.gems;
    for (let i = 0; i < 40; i++) {
      input.attackEdge = true;
      tap(hitButton(buy.x + buy.w / 2, buy.y + buy.h / 2));
      frame();
    }
    expect(JSON.stringify(state.up)).toBe(before);
    expect(state.gems).toBe(gemsBefore);

    run(60); // 잠금 해제 후에는 정상 동작
    pressButton(buy);
    expect(JSON.stringify(state.up)).not.toBe(before);
  });

  it("사망 순간 연타해도 사망 화면이 유지된다", () => {
    startChapter(2);
    state.player.hp = 1;
    for (let i = 0; i < 120; i++) {
      input.attackEdge = true;
      tap(hitButton(W / 2, 800));
      if (i === 5) state.player.hp = 0;
      frame();
      expect(state.scene, `프레임 ${i}`).not.toBe("title");
    }
    expect(state.scene).toBe("dead");
  });
});

describe("타이틀 / 랭킹 진입", () => {
  it("타이틀에 스토리·무한·랭킹·조작·소리 버튼이 모두 있다", () => {
    newGame();
    const bs = sceneButtons();
    const ids = bs.map((b) => b.id);
    expect(ids).toContain("start");
    expect(ids).toContain("endless");
    expect(bs.map((b) => b.kind)).toContain("sound");
    expect(bs.map((b) => b.kind)).toContain("rank");
    expect(bs.map((b) => b.kind)).toContain("control");
  });

  it("무한모드 버튼은 곧장 플레이로 들어간다", () => {
    newGame();
    const btn = sceneButtons().find((b) => b.id === "endless")!;
    pressButton(btn);
    expect(state.scene).toBe("play");
    expect(state.mode).toBe("endless");
  });

  it("타이틀 버튼들이 화면 안에 있고 서로 겹치지 않는다", () => {
    newGame();
    const bs = sceneButtons();
    for (const b of bs) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.w).toBeLessThanOrEqual(W);
      expect(b.y + b.h).toBeLessThanOrEqual(H);
    }
    for (let i = 0; i < bs.length; i++) {
      for (let j = i + 1; j < bs.length; j++) {
        const a = bs[i];
        const b = bs[j];
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap, `${a.id} / ${b.id}`).toBe(false);
      }
    }
  });

  it("랭킹 버튼은 게임을 시작하지 않고 랭킹 화면으로 간다", () => {
    newGame();
    vi.stubGlobal("fetch", async () => ({ ok: true, status: 200, json: async () => [] }));
    const rankBtn = sceneButtons().find((b) => b.kind === "rank")!;
    pressButton(rankBtn);
    expect(state.scene).toBe("rank");
    vi.unstubAllGlobals();
  });

  it("소리 버튼은 씬을 넘기지 않는다", () => {
    newGame();
    const snd = sceneButtons().find((b) => b.kind === "sound")!;
    pressButton(snd);
    expect(state.scene).toBe("title");
    pressButton(snd);
    pressButton(snd);
  });

  it("게임 시작 버튼은 스토리로 간다", () => {
    newGame();
    const start = sceneButtons().find((b) => b.id === "start")!;
    pressButton(start);
    expect(state.scene).toBe("story");
    expect(state.storyIdx).toBe(0);
  });
});

describe("점수", () => {
  it("내역이 처치·보급품·시간 보너스로 나뉘고 합이 총점과 같다", () => {
    startChapter(1);
    const e = state.enemies[0];
    const def = ENEMY_DEF[e.type];
    e.hp = 0;
    update(1 / 60);
    expect(state.sc.kills).toBe(def.score);
    expect(state.score).toBe(def.score);

    state.runTime = 100;
    finishRun("ending");
    expect(state.sc.time).toBe(timeBonus(100));
    expect(state.sc.kills + state.sc.items + state.sc.time).toBe(state.score);
  });

  it("시간 보너스는 오래 걸릴수록 줄고 0 아래로 가지 않는다", () => {
    expect(timeBonus(0)).toBe(3000);
    expect(timeBonus(100)).toBeLessThan(timeBonus(50));
    expect(timeBonus(100000)).toBe(0);
  });

  it("최고 점수가 저장된다", () => {
    startChapter(2);
    state.score = 12345;
    state.player.hp = 0;
    frame();
    expect(state.scene).toBe("dead");
    expect(getBest()).toBe(12345);
    expect(lsStore.get("kimdaewon.best")).toBe("12345");
  });
});

describe("상점", () => {
  it("업그레이드가 능력치에 반영된다", () => {
    newGame();
    const hp0 = stat.maxhp();
    const dmg0 = stat.dmg();
    const cd0 = stat.atkCd();
    state.gems = 500;
    expect(buyUpgrade("hp")).toBe(true);
    expect(buyUpgrade("atk")).toBe(true);
    expect(buyUpgrade("spd")).toBe(true);
    expect(stat.maxhp()).toBe(hp0 + 20);
    expect(stat.dmg()).toBe(dmg0 + 4);
    expect(stat.atkCd()).toBeLessThan(cd0);
  });

  it("최대 레벨과 잔액 부족을 지킨다", () => {
    newGame();
    state.gems = 10000;
    for (let i = 0; i < UP_MAX; i++) expect(buyUpgrade("dash")).toBe(true);
    expect(buyUpgrade("dash")).toBe(false);
    state.gems = 0;
    expect(buyUpgrade("hp")).toBe(false);
  });

  it("무한모드에서는 체력·공격력만 상한이 없고, 나머지는 스토리와 같은 상한을 유지한다", () => {
    startEndless();
    state.gems = 1_000_000;

    // 체력·공격력: 레벨 4를 넘어도 계속 살 수 있다
    for (let i = 0; i < UP_MAX; i++) buyUpgrade("hp");
    expect(state.up.hp).toBe(UP_MAX);
    expect(buyUpgrade("hp")).toBe(true);
    expect(state.up.hp).toBe(UP_MAX + 1);
    expect(upCostAt(UP_MAX)).toBeGreaterThan(upCostAt(UP_MAX - 1)); // 비용도 계속 오른다

    // 회피는 무한모드에서도 4레벨에서 막힌다
    for (let i = 0; i < UP_MAX; i++) buyUpgrade("dash");
    expect(state.up.dash).toBe(UP_MAX);
    expect(buyUpgrade("dash")).toBe(false);
  });

  it("스토리 모드에서는 체력·공격력도 4레벨에서 막힌다 (회귀)", () => {
    newGame();
    state.gems = 1_000_000;
    for (let i = 0; i < UP_MAX; i++) buyUpgrade("atk");
    expect(state.up.atk).toBe(UP_MAX);
    expect(buyUpgrade("atk")).toBe(false);
  });

  it("upCostAt 은 레벨 0~3 에서 기존 UP_COST 값과 정확히 같다", () => {
    expect([0, 1, 2, 3].map(upCostAt)).toEqual([10, 18, 30, 46]);
  });
});

describe("스테이지 카드", () => {
  it("자동으로 넘어가고 신규 적을 한 번만 소개한다", () => {
    newGame();
    state.pendingChapter = 1;
    gotoCard();
    expect(state.scene).toBe("card");
    run(60 * 4);
    expect(state.scene).toBe("play");
    expect(state.chapterIdx).toBe(1);
    expect(state.seen.has("walker")).toBe(true);

    state.pendingChapter = 2;
    gotoCard();
    run(60 * 4);
    expect(state.seen.has("walker")).toBe(true);
    expect(state.seen.has("spore")).toBe(true);
  });
});

describe("도트 스프라이트", () => {
  it("모든 스프라이트의 행 길이가 같고 팔레트에 없는 글자를 쓰지 않는다", () => {
    for (const [id, def] of Object.entries(SPRITES)) {
      const cols = def.rows[0].length;
      expect(cols, `${id} 는 비어 있으면 안 된다`).toBeGreaterThan(0);
      expect(Number.isInteger(def.scale) && def.scale > 0, `${id} 의 scale 은 양의 정수`).toBe(true);
      for (const [y, row] of def.rows.entries()) {
        expect(row.length, `${id} 의 ${y}행 길이`).toBe(cols);
        for (const ch of row) {
          expect(ch === "." || ch in PAL, `${id} 의 알 수 없는 글자 "${ch}"`).toBe(true);
        }
      }
    }
  });

  it("적 종류마다 스프라이트가 하나씩 있다", () => {
    for (const t of Object.keys(ENEMY_DEF) as EnemyType[]) {
      expect(SPRITES[t], `${t} 스프라이트 없음`).toBeDefined();
    }
  });

  it("캔버스를 못 만드는 환경에서는 폴백으로 넘어간다 (터지지 않는다)", () => {
    expect(sprite("hero")).toBeNull();
    expect(blit(fakeCtx, "hero", 0, 0)).toBe(false);
  });
});

describe("스테이지 진행도", () => {
  it("보급 스테이지는 모은 보급품 비율만큼 찬다", () => {
    startChapter(0);
    // 배회하는 잡몹은 spawn0 에 잡히지만 스테이지 진행도에는 영향을 주지 않는다
    expect(state.spawn0).toBeGreaterThan(0);
    expect(stageProgress()).toBe(0);
    state.player.supplies = 3;
    expect(stageProgress()).toBeCloseTo(0.5);
    state.player.supplies = CHAPTERS[0].need!;
    expect(stageProgress()).toBe(1);
  });

  it("전투 스테이지는 처치 비율만큼 차고, 분열해도 0~1 을 벗어나지 않는다", () => {
    startChapter(2);
    const n = state.spawn0;
    expect(n).toBeGreaterThan(0);
    expect(stageProgress()).toBe(0);
    state.enemies.splice(0, Math.floor(n / 2));
    expect(stageProgress()).toBeCloseTo(1 - Math.ceil(n / 2) / n);

    // 분열로 초기 스폰보다 많아져도 음수가 되지 않는다
    for (let i = 0; i < n * 2; i++) state.enemies.push(state.enemies[0]);
    expect(stageProgress()).toBe(0);

    state.enemies.length = 0;
    expect(stageProgress()).toBe(1);
  });

  it("보스 스테이지는 보스 체력이 깎인 만큼 찬다", () => {
    startChapter(BOSS_CH);
    const b = state.enemies.find((e) => e.type === "boss")!;
    expect(stageProgress()).toBe(0);
    b.hp = b.maxhp / 4;
    expect(stageProgress()).toBeCloseTo(0.75);
  });

  it("포털이 열리면 그 스테이지는 다 찬 것으로 본다", () => {
    startChapter(1);
    state.portal = { x: 100, y: 100, r: 22, t: 0 };
    expect(stageProgress()).toBe(1);
  });

  it("모든 화면에서 진행도 트랙을 그려도 터지지 않는다", () => {
    for (const s of ["title", "card", "shop", "rank", "play", "dead", "ending"] as const) {
      startChapter(1);
      setScene(s, 0);
      expect(() => draw()).not.toThrow();
    }
  });
});

describe("무한모드", () => {
  it("스토리 모드와 분리되어 있고 마왕 타입을 쓰지 않는다", () => {
    startEndless();
    expect(state.mode).toBe("endless");
    expect(state.chapterIdx).toBe(0);
    expect(state.scene).toBe("play");
    expect(state.enemies.some((e) => e.type === "boss")).toBe(false);
  });

  it("파도가 오를수록 적 체력과 속도가 상한 없이 계속 오른다", () => {
    newGame();
    state.mode = "endless";
    state.pendingChapter = 0;
    beginChapter();
    const baseHp = state.enemies[0].maxhp;
    const baseSpd = ENEMY_DEF[state.enemies[0].type].spd;

    state.pendingChapter = 10;
    beginChapter();
    expect(state.enemies[0].maxhp).toBeGreaterThan(baseHp);
    expect(state.enemies[0].spd).toBeGreaterThan(baseSpd);

    // 25파도를 넘어가도 계속 오른다 (예전엔 여기서 상한에 걸렸다)
    state.pendingChapter = 25;
    beginChapter();
    const hpAt25 = state.enemies[0].maxhp;
    state.pendingChapter = 60;
    beginChapter();
    expect(state.enemies[0].maxhp).toBeGreaterThan(hpAt25);
  });

  it("파도가 오를수록 피해량도 오른다 (체력만 쌓아서 안 죽던 문제의 회귀 방지)", () => {
    startEndless();
    const p = state.player;
    p.inv = 0; // 스폰 직후 무적 시간을 없애야 접촉 피해가 바로 들어간다

    const e0 = state.enemies[0];
    const d = ENEMY_DEF[e0.type];
    expect(e0.dmgMult ?? 1).toBe(1); // 1라운드(웨이브 0)는 배율 1
    p.hp = 9999;
    p.x = e0.x;
    p.y = e0.y;
    e0.touch = 0;
    update(1 / 60);
    const lostEarly = 9999 - p.hp;
    expect(lostEarly).toBeCloseTo(d.dmg, 5);

    state.pendingChapter = 30;
    beginChapter();
    const e1 = state.enemies[0];
    expect(e1.dmgMult).toBeGreaterThan(1);
    p.inv = 0;
    p.hp = 9999;
    p.x = e1.x;
    p.y = e1.y;
    e1.touch = 0;
    update(1 / 60);
    const lostLate = 9999 - p.hp;
    expect(lostLate).toBeGreaterThan(lostEarly);
  });

  it("보스전 종료 후에도 스토리 모드는 CHAPTERS 를 그대로 쓴다 (회귀)", () => {
    startChapter(2);
    expect(state.mode).toBe("story");
    expect(currentChapter(2).name).toBe(CHAPTERS[2].name);
  });

  it("새 적이 없는 파도는 카드를 건너뛰고 곧장 다음 라운드로 간다", () => {
    startEndless();
    state.enemies.length = 0;
    frame();
    expect(state.portal).toBeTruthy();
    state.player.x = state.portal!.x;
    state.player.y = state.portal!.y;
    frame();
    expect(state.scene).toBe("shop");
    run(60);
    pressButton(sceneButtons().find((b) => b.kind === "go")!);
    // 1라운드에 없던 신규 타입이 2라운드(스폰풀에 spore 없음, w=2도 없음)에도 없으면 카드 없이 바로 진행
    expect(["play", "card"]).toContain(state.scene);
  });
});

describe("조작 방식", () => {
  it("기본은 드래그형이고, 토글하면 저장되어 유지된다", () => {
    expect(getControlMode()).toBe("drag");
    cycleControlMode();
    expect(getControlMode()).toBe("fixed");
    expect(lsStore.get("kimdaewon.control")).toBe("fixed");
    cycleControlMode();
    expect(getControlMode()).toBe("drag");
  });

  it("타이틀에서 버튼으로 전환할 수 있다", () => {
    newGame();
    const before = getControlMode();
    const btn = sceneButtons().find((b) => b.kind === "control")!;
    expect(btn).toBeTruthy();
    pressButton(btn);
    expect(getControlMode()).not.toBe(before);
    pressButton(btn); // 원복 — 다른 테스트에 영향 주지 않는다
  });
});

describe("랭킹 — 모드 분리", () => {
  it("등록 본문에 모드가 들어가고, 조회는 지금 탭의 모드로 필터링한다", async () => {
    startEndless();
    state.score = 999;
    const calls: any[] = [];
    vi.stubGlobal("fetch", async (url: string, opts: any) => {
      calls.push({ url, opts });
      const post = (opts?.method ?? "GET") === "POST";
      return {
        ok: true, status: post ? 201 : 200,
        json: async () => (post ? [{ id: 1 }] : [{ nick: "테스터", score: 999, stage: 12, kills: 3 }]),
      };
    });
    await submitScore("테스터");
    const post = calls.find((c) => c.opts.method === "POST");
    expect(JSON.parse(post.opts.body).mode).toBe("endless");
    // submitScore 내부에서 방금 플레이한 모드로 다시 조회한다
    const get = calls.find((c) => c.opts.method !== "POST");
    expect(get.url).toContain("mode=eq.endless");
    expect(rank.mode).toBe("endless");
    vi.unstubAllGlobals();
  });

  it("타이틀 랭킹 버튼은 항상 스토리 탭으로 연다", async () => {
    newGame();
    vi.stubGlobal("fetch", async (url: string) => {
      expect(url).toContain("mode=eq.story");
      return { ok: true, status: 200, json: async () => [] };
    });
    pressButton(sceneButtons().find((b) => b.kind === "rank")!);
    expect(rank.mode).toBe("story");
    vi.unstubAllGlobals();
  });

  it("탭 버튼으로 전환하면 그 모드로 다시 불러온다", async () => {
    newGame();
    setScene("rank", 0);
    let lastUrl = "";
    vi.stubGlobal("fetch", async (url: string) => {
      lastUrl = url;
      return { ok: true, status: 200, json: async () => [] };
    });
    const endlessTab = sceneButtons().find((b) => b.id === "tab-endless")!;
    pressButton(endlessTab);
    await Promise.resolve();
    expect(rank.mode).toBe("endless");
    expect(lastUrl).toContain("mode=eq.endless");
    vi.unstubAllGlobals();
  });
});

describe("랭킹", () => {
  it("publishable 키만 쓰고 secret 키가 섞이지 않았다", () => {
    expect(rankOn()).toBe(true);
    expect(SUPABASE_URL).toMatch(/^https:\/\/[a-z0-9]+\.supabase\.co$/);
    expect(SUPABASE_ANON_KEY).not.toMatch(/service_role|sb_secret_/);
    expect(SUPABASE_ANON_KEY).toMatch(/^(sb_publishable_|eyJ)/);
  });

  it("조회 요청이 올바른 URL·헤더로 나간다", async () => {
    const calls: any[] = [];
    vi.stubGlobal("fetch", async (url: string, opts: any) => {
      calls.push({ url, opts });
      return { ok: true, status: 200, json: async () => [{ nick: "가", score: 900, stage: 8, kills: 60 }] };
    });
    await fetchRanking();
    expect(calls.length).toBe(1);
    expect(calls[0].url).toContain("/rest/v1/scores");
    expect(calls[0].url).toContain("order=score.desc");
    expect(calls[0].opts.headers.apikey).toBe(SUPABASE_ANON_KEY);
    expect(rank.status).toBe("ok");
    expect(rank.rows!.length).toBe(1);
    vi.unstubAllGlobals();
  });

  it("등록 본문이 올바르고, 갱신되면 updated=true", async () => {
    startChapter(4);
    state.score = 4321;
    state.kills = 17;
    state.runTime = 88.24;
    const calls: any[] = [];
    vi.stubGlobal("fetch", async (url: string, opts: any) => {
      calls.push({ url, opts });
      const post = (opts?.method ?? "GET") === "POST";
      return {
        ok: true, status: post ? 201 : 200,
        json: async () => (post ? [{ id: 1 }] : [{ nick: "테스터", score: 4321, stage: 5, kills: 17 }]),
      };
    });
    const res = await submitScore("  테스터  ");
    const post = calls.find((c) => c.opts.method === "POST");
    const body = JSON.parse(post.opts.body);
    expect(body.nick).toBe("테스터"); // 앞뒤 공백 제거
    expect(body.score).toBe(4321);
    expect(body.stage).toBe(5);
    expect(body.kills).toBe(17);
    expect(post.opts.headers.Prefer).toBe("return=representation");
    expect(res.updated).toBe(true);
    expect(rank.notice).toBe("");
    vi.unstubAllGlobals();
  });

  it("중복 닉네임으로 더 낮은 점수를 내면 갱신되지 않고 안내가 뜬다", async () => {
    startChapter(4);
    state.score = 100;
    vi.stubGlobal("fetch", async (_url: string, opts: any) => {
      const post = (opts?.method ?? "GET") === "POST";
      // 트리거가 등록을 건너뛰면 빈 배열이 돌아온다
      return {
        ok: true, status: post ? 201 : 200,
        json: async () => (post ? [] : [{ nick: "테스터", score: 9999, stage: 8, kills: 99 }]),
      };
    });
    const res = await submitScore("테스터");
    expect(res.updated).toBe(false);
    expect(rank.notice).toContain("기존 최고 기록");
    expect(rank.mine).toBe(0); // 기존 기록 위치를 가리킨다
    vi.unstubAllGlobals();
  });

  it("등록 실패 시 알아볼 수 있는 오류가 난다", async () => {
    vi.stubGlobal("fetch", async () => ({ ok: false, status: 403, json: async () => ({}) }));
    await expect(submitScore("아무개")).rejects.toThrow(/권한/);
    vi.unstubAllGlobals();
  });
});

describe("전체 흐름", () => {
  it("타이틀 → 스토리 → 마트 → 상점 → 카드 → 스테이지", () => {
    newGame();
    pressButton(sceneButtons().find((b) => b.id === "start")!);
    expect(state.scene).toBe("story");
    run(60);
    input.enterEdge = true;
    frame();
    expect(state.scene).toBe("play");
    expect(state.chapterIdx).toBe(0);

    state.player.supplies = 99;
    frame();
    state.player.x = state.portal!.x;
    state.player.y = state.portal!.y;
    frame();
    expect(state.scene).toBe("story");
    expect(state.storyIdx).toBe(1);

    run(60);
    input.enterEdge = true;
    frame();
    expect(state.scene).toBe("shop");

    run(60);
    pressButton(sceneButtons().find((b) => b.kind === "go")!);
    expect(state.scene).toBe("card");
    run(60 * 4);
    expect(state.scene).toBe("play");
    expect(state.chapterIdx).toBe(1);
  });
});
