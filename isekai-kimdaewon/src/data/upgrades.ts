import type { UpgradeId } from "../types";

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  eff: string;
}

export const UPGRADES: UpgradeDef[] = [
  { id: "hp", name: "최대 체력", eff: "+20" },
  { id: "food", name: "최대 허기", eff: "+20 · 감소 -10%" },
  { id: "atk", name: "렌치 공격력", eff: "+4" },
  { id: "spd", name: "공격 속도", eff: "쿨다운 -0.04초" },
  { id: "dash", name: "회피", eff: "쿨다운 -0.1초 · 소모 -0.5" },
];

/** 스토리 모드, 그리고 무한모드에서도 회피·공속·허기는 이 상한을 유지한다.
 *  체력·공격력만 무한모드에서 상한이 풀린다(UNCAPPED_IN_ENDLESS) — 적이 끝없이
 *  세지니 받아치는 힘도 끝없이 오를 수 있어야 한다는 요청으로 정한 것. */
export const UP_MAX = 4;
export const UNCAPPED_IN_ENDLESS: readonly UpgradeId[] = ["hp", "atk"];

/** 레벨 0~3 에서 기존 UP_COST([10,18,30,46])와 정확히 일치하는 2차함수.
 *  무한모드의 hp/atk 는 레벨 4 이후로도 이 공식을 그대로 이어 쓴다. */
export const upCostAt = (level: number): number => 2 * level * level + 6 * level + 10;
