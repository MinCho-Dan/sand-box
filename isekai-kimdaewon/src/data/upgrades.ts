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

export const UP_MAX = 4;
/** 스테이지 8개 기준 총 마정석 수급 약 180 에 맞춘 값 */
export const UP_COST = [10, 18, 30, 46];
