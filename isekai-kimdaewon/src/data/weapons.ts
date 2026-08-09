import type { ToolId, WeaponId } from "../types";

export interface WeaponDef {
  name: string;
  dmg: number;
  reach: number;
  /** 타격 판정 각도(±rad) */
  arc: number;
  /** 공격 쿨다운(초) */
  cd: number;
  /** 스윙 1회당 배터리 소모 */
  drain: number;
  color: string;
}

export const BATT_MAX = 100;

/** 렌치는 기본 무기라 배터리를 쓰지 않는다.
 *  전동공구는 공용 배터리를 스윙마다 소모하고, 방전되면 렌치로 자동 복귀한다.
 *  주석의 횟수는 완충(100) 기준 최대 스윙 수. */
export const WEAPONS: Record<WeaponId, WeaponDef> = {
  wrench: { name: "파이프 렌치", dmg: 16, reach: 50, arc: 1.0, cd: 0.38, drain: 0, color: "#9fb0a8" },
  driver: { name: "전동드라이버", dmg: 26, reach: 54, arc: 0.85, cd: 0.3, drain: 5, color: "#f0c04a" }, // 20회
  saw: { name: "전기톱", dmg: 34, reach: 74, arc: 0.7, cd: 0.26, drain: 11, color: "#e2662f" }, //  9회
  hammer: { name: "해머드릴", dmg: 42, reach: 52, arc: 0.75, cd: 0.4, drain: 10, color: "#4aa3f0" }, // 10회
  grinder: { name: "그라인더", dmg: 38, reach: 38, arc: 1.15, cd: 0.28, drain: 4, color: "#c65ad0" }, // 25회
};

export const TOOL_IDS: ToolId[] = ["driver", "saw", "hammer", "grinder"];

/** 배터리가 바닥난 상태로 공구를 주웠을 때 딸려오는 최소 충전량 */
export const TOOL_PICKUP_CHARGE = 40;
/** 배터리 아이템 1개 회복량 */
export const BATT_DROP = 22;
