/** 화면 규격.
 *  캔버스 540x972 = 상단 HUD 108 + 아레나 864.
 *  월드 좌표(플레이어·적·아이템)는 (0,0)~(W,AH) 안에서만 움직이고,
 *  렌더링할 때 HUD_H 만큼 아래로 옮겨 그린다. */
export const TS = 36;
export const MW = 15;
export const MH = 24;
export const W = MW * TS; // 540
export const AH = MH * TS; // 864
export const HUD_H = 108;
export const H = AH + HUD_H; // 972

export const COL = {
  floor: "#131a19",
  floor2: "#101615",
  wall: "#26332e",
  wallTop: "#33443c",
  hero: "#8fe3c0",
  heroDk: "#3d7f66",
  rift: "#b06cff",
  danger: "#ff5c5c",
  gem: "#c89bff",
  food: "#ffd166",
  batt: "#7fe0ff",
  text: "#cfe8dd",
  dim: "#5d7a70",
} as const;

export interface Theme {
  f1: string;
  f2: string;
  w: string;
  wt: string;
  deco: "grass" | "crack" | "ice" | null;
}

export const THEMES: Record<string, Theme> = {
  mart: { f1: COL.floor, f2: COL.floor2, w: COL.wall, wt: COL.wallTop, deco: null },
  field: { f1: "#1c3520", f2: "#172d1c", w: "#6b5a3a", wt: "#8f7748", deco: "grass" },
  stone: { f1: "#2b2a26", f2: "#242320", w: "#4a4740", wt: "#5f5b51", deco: "crack" },
  mine: { f1: "#241d18", f2: "#1d1713", w: "#4a3a2a", wt: "#66513a", deco: "crack" },
  ice: { f1: "#1b2c38", f2: "#16242e", w: "#3f5a6b", wt: "#5b8098", deco: "ice" },
  dark: { f1: "#120f1a", f2: "#0e0c15", w: "#241d33", wt: "#33294a", deco: null },
};

/* ── 랭킹 설정 ─────────────────────────────────────────────────
   비워두면 랭킹 기능이 꺼지고, 게임은 그대로 동작하며 최고 점수만
   브라우저에 저장된다.

   ※ anon(publishable) 키만 넣을 것.
     service_role / secret 키는 RLS 를 통째로 우회하는 비밀키다.
     anon 키는 방문자 브라우저에 어차피 노출되는 공개 키이며,
     실제 접근 통제는 supabase.sql 의 RLS 정책이 담당한다. */
export const SUPABASE_URL = "https://nfrdrhwwqjxfqkhztmds.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_LUDTmMxJt6EW42zRjdKSog_c4Vo6koI";
