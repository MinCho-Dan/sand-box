import { sfx } from "../audio";
import { COL } from "../config";
import { SUPPLY_FLAVOR } from "../data/chapters";
import { BATT_MAX, WEAPONS } from "../data/weapons";
import { burst, popText } from "../core/fx";
import { equipTool, state, stat, toast } from "../core/state";
import { clamp, dist } from "../core/util";

/** 보급품 1개당 점수 */
export const SUPPLY_SCORE = 50;
/** 보급품 1개당 마정석 */
export const SUPPLY_GEM = 2;
/** 마정석이 플레이어 쪽으로 빨려오기 시작하는 거리 */
const MAGNET_RANGE = 130;
/** 보급품은 이 거리 안이면 자석처럼 끌려온다 — "그냥 줍기만 한다"는
 *  지루함의 절반은 선반 사이를 되짚어 가는 데서 온다 */
const SUPPLY_MAGNET_RANGE = 70;

export function updateItems(dt: number): void {
  const p = state.player;

  for (let i = state.items.length - 1; i >= 0; i--) {
    const it = state.items[i];
    it.t += dt;

    if (it.type === "gem") {
      const d = dist(p, it);
      if (d < MAGNET_RANGE) {
        const a = Math.atan2(p.y - it.y, p.x - it.x);
        const s = 90 + (MAGNET_RANGE - d) * 3.2;
        it.x += Math.cos(a) * s * dt;
        it.y += Math.sin(a) * s * dt;
      }
    } else if (it.type === "supply") {
      const d = dist(p, it);
      if (d < SUPPLY_MAGNET_RANGE) {
        const a = Math.atan2(p.y - it.y, p.x - it.x);
        const s = 70 + (SUPPLY_MAGNET_RANGE - d) * 2.4;
        it.x += Math.cos(a) * s * dt;
        it.y += Math.sin(a) * s * dt;
      }
    }

    if (dist(p, it) >= p.r + it.r) continue;
    state.items.splice(i, 1);

    switch (it.type) {
      case "supply":
        p.supplies++;
        p.hunger = clamp(p.hunger + 26, 0, stat.maxfood());
        state.score += SUPPLY_SCORE;
        state.sc.items += SUPPLY_SCORE;
        state.gems += SUPPLY_GEM;
        popText(state, it.x, it.y, it.label ?? "보급품", COL.food, 13);
        // 진행 카운터는 HUD 상단에 항상 보이니, 토스트는 서사를 붙이는 데 쓴다
        toast(SUPPLY_FLAVOR[it.label ?? ""] ?? "보급품을 챙겼다.");
        break;
      case "food":
        p.hunger = clamp(p.hunger + 34, 0, stat.maxfood());
        popText(state, it.x, it.y, "+허기", COL.food, 13);
        break;
      case "medkit":
        p.hp = clamp(p.hp + 28, 0, stat.maxhp());
        popText(state, it.x, it.y, "+체력", "#6fe08a", 13);
        break;
      case "gem":
        state.gems += it.val ?? 0;
        popText(state, it.x, it.y, "+" + (it.val ?? 0), COL.gem, 13);
        break;
      case "batt":
        // 전동공구가 없어도 배터리는 쌓인다 — 나중에 공구를 주우면 바로 쓸 수 있다
        state.battery = clamp(state.battery + (it.val ?? 0), 0, BATT_MAX);
        popText(state, it.x, it.y, "배터리 +" + (it.val ?? 0), COL.batt, 13);
        break;
      case "tool":
        if (it.tool) {
          equipTool(it.tool);
          toast(WEAPONS[it.tool].name + " 획득");
          popText(state, it.x, it.y, WEAPONS[it.tool].name, WEAPONS[it.tool].color, 14, 1.1);
        }
        break;
    }

    if (it.type === "gem") sfx("gem");
    else if (it.type === "batt") sfx("batt");
    else if (it.type === "tool") sfx("tool");
    else {
      burst(state, it.x, it.y, 8, COL.food, 110, 0.35);
      sfx("food");
    }
    if (it.type === "batt" || it.type === "tool") burst(state, it.x, it.y, 10, COL.batt, 130, 0.4);
  }
}
