import type { EnemyType } from "../types";

export interface EnemyDef {
  name: string;
  hp: number;
  spd: number;
  r: number;
  dmg: number;
  color: string;
  score: number;
  gem: number;
  ranged?: boolean;
  charge?: boolean;
  /** 돌진 속도 */
  rush?: number;
  /** 처치 시 분열하는 개수 */
  split?: number;
  boss?: boolean;
}

export const ENEMY_DEF: Record<EnemyType, EnemyDef> = {
  walker: { name: "고블린", hp: 38, spd: 58, r: 15, dmg: 15, color: "#8a9b4a", score: 100, gem: 3 },
  spore: { name: "슬라임", hp: 16, spd: 118, r: 10, dmg: 8, color: "#5fd2c0", score: 60, gem: 1 },
  watcher: { name: "흑마법사", hp: 52, spd: 42, r: 16, dmg: 11, color: "#5f7fd3", score: 180, gem: 6, ranged: true },
  charger: { name: "돌진병", hp: 46, spd: 60, r: 16, dmg: 19, color: "#c46a4a", score: 220, gem: 5, charge: true, rush: 430 },
  splitter: { name: "분열체", hp: 40, spd: 72, r: 17, dmg: 13, color: "#7fd15f", score: 150, gem: 4, split: 2 },
  // charge:true 는 이 적이 직접 처리하지는 않는다(마왕은 전용 상태머신을 쓴다) —
  // world.ts 의 예고선/돌진 잔상 렌더링이 d.charge 만 보고 그려서, 재사용하려고 켜 둔 것.
  boss: { name: "마왕 현상", hp: 780, spd: 46, r: 34, dmg: 17, color: "#b06cff", score: 1500, gem: 40,
    boss: true, charge: true, rush: 540 },
};

export const CODEX: Record<EnemyType, string> = {
  walker: "곧장 달려든다. 붙기 전에 쳐내라.",
  spore: "빠르지만 약하다. 지그재그로 다가온다.",
  watcher: "거리를 벌리며 3연발 탄막을 쏜다.\n탄막은 렌치로 쳐낼 수 있다.",
  charger: "멈춰서 자세를 잡은 뒤 직선으로 돌진한다.\n조준선이 보이면 옆으로 피해라.",
  splitter: "쓰러뜨리면 둘로 갈라진다.\n갈라진 것까지 정리해야 끝난다.",
  boss: "탄막과 소환을 반복한다.\n체력 절반 아래에서는 돌진까지 섞는다 — 조준선이 보이면 피해라.",
};
