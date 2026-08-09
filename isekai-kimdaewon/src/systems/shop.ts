import { H, W } from "../config";
import { UPGRADES, UP_COST, UP_MAX } from "../data/upgrades";
import { state, stat } from "../core/state";
import type { UiButton, UpgradeId } from "../types";
import { clamp } from "../core/util";

export const SHOP_ROW_Y = 250;
export const SHOP_ROW_H = 96;

export const upCost = (id: UpgradeId) => UP_COST[state.up[id]];
export const canBuy = (id: UpgradeId) => state.up[id] < UP_MAX && state.gems >= upCost(id);

export function buyUpgrade(id: UpgradeId): boolean {
  if (!canBuy(id)) return false;
  state.gems -= upCost(id);
  state.up[id]++;
  const p = state.player;
  // 최대치를 올렸으면 그만큼 현재치도 채워준다
  if (id === "hp") p.hp = clamp(p.hp + 20, 0, stat.maxhp());
  if (id === "food") p.hunger = clamp(p.hunger + 20, 0, stat.maxfood());
  return true;
}

export function shopButtons(): UiButton[] {
  const out: UiButton[] = UPGRADES.map((u, i) => ({
    id: u.id,
    kind: "buy" as const,
    x: W - 128,
    y: SHOP_ROW_Y + i * SHOP_ROW_H - 26,
    w: 112,
    h: 52,
  }));
  out.push({ id: "go", kind: "go", x: W / 2 - 110, y: H - 130, w: 220, h: 60 });
  return out;
}
