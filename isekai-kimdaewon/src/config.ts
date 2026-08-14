/** 화면 규격.
 *  캔버스 540x972 = 상단 HUD 108 + 아레나 684 + 하단 컨트롤 밴드 180.
 *  월드 좌표(플레이어·적·아이템)는 (0,0)~(W,AH) 안에서만 움직이고,
 *  렌더링할 때 HUD_H 만큼 아래로 옮겨 그린다.
 *  하단 CTRL_H 는 아레나에서 제외된 예약 공간이라 터치 버튼이 적이나
 *  아이템을 가리는 일이 없다. PC 모드에서는 조작 안내 텍스트가 채운다.
 *  처음엔 72px(2타일)로 뒀다가 "버튼이 너무 밑에 있다"는 피드백을 받고
 *  180px(5타일, 2.5배)로 늘렸다 — 아레나를 아주 조금만 더 줄이는 대신
 *  버튼 쪽에 여유를 몰아준 것이다. */
export const TS = 36;
export const MW = 15;
export const MH = 19;
export const W = MW * TS; // 540
export const AH = MH * TS; // 684
export const HUD_H = 108;
export const CTRL_H = 180;
export const H = AH + HUD_H + CTRL_H; // 972

/** 팔레트는 키 아트(폭풍우 치는 남색 하늘 · 금색 타이틀 · 시안 검기 ·
 *  주황 화염 · 보라 균열)에서 뽑았다. 색을 바꿀 일이 있으면 여기만 고친다. */
export const COL = {
  bg: "#080b18",
  panel: "#111a36",
  floor: "#171d2e",
  floor2: "#131828",
  wall: "#2c3550",
  wallTop: "#3d4870",
  /** UI 강조색 — 키 아트 타이틀의 금색 */
  hero: "#ffd75e",
  heroDk: "#8f5a10",
  /** 검기 · 배터리 · 마력 */
  cyan: "#6fe4ff",
  /** 화염 · 폭발 */
  fire: "#ff9a2e",
  rift: "#b06cff",
  danger: "#ff4d5e",
  gem: "#c89bff",
  food: "#ffb347",
  batt: "#6fe4ff",
  text: "#e6ecff",
  dim: "#7f8cba",
  /** 김대원의 갑옷과 피부 */
  armor: "#38456f",
  armorLt: "#5a6ca6",
  skin: "#e8b88c",
} as const;

/** 패널·버튼·구분선에 반복해서 쓰는 반투명 금색.
 *  개별 화면에 rgba 문자열을 흩뿌리지 않으려고 모아 뒀다. */
export const UI = {
  fill: "rgba(255,215,94,.10)",
  fillOn: "rgba(255,215,94,.18)",
  line: "rgba(255,215,94,.55)",
  lineDim: "rgba(255,215,94,.20)",
  /** 버튼 바탕 — 금색을 얇게 깔면 올리브색으로 탁해져서 남색 판을 깐다 */
  btn: "rgba(22,32,66,.96)",
  btnOff: "rgba(16,22,42,.85)",
  off: "rgba(38,50,86,.45)",
  offLine: "rgba(90,108,166,.28)",
  offText: "#55618f",
} as const;

export interface Theme {
  f1: string;
  f2: string;
  w: string;
  wt: string;
  deco: "grass" | "crack" | "ice" | null;
}

export const THEMES: Record<string, Theme> = {
  mart: { f1: COL.floor, f2: COL.floor2, w: COL.wall, wt: COL.wallTop, deco: "crack" },
  field: { f1: "#1e3a24", f2: "#18301e", w: "#5d4a2c", wt: "#7d6538", deco: "grass" },
  stone: { f1: "#262a42", f2: "#1f2338", w: "#454d70", wt: "#5b6590", deco: "crack" },
  mine: { f1: "#2a1c18", f2: "#221612", w: "#52321f", wt: "#74472a", deco: "crack" },
  ice: { f1: "#16283e", f2: "#122032", w: "#2f4d70", wt: "#46709c", deco: "ice" },
  dark: { f1: "#150e26", f2: "#110b1f", w: "#2c1c4a", wt: "#442a6e", deco: null },
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
