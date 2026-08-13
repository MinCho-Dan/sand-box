/** 도트 스프라이트를 문자열 그림으로 들고 있다.
 *
 *  한 글자가 한 픽셀이고 `.` 은 투명. 색은 아래 PAL 이 정한다.
 *  키 아트(남색 갑옷 · 금색 장식 · 시안 마력 · 주황 화염 · 보라 균열)의
 *  색만 쓰도록 팔레트를 좁게 유지한다 — 색이 늘어나면 화면이 지저분해진다.
 *
 *  한 행의 길이는 전부 같아야 한다. 어긋나면 bake 가 바로 예외를 던지고
 *  테스트가 잡는다. */
export const PAL: Record<string, string> = {
  k: "#101528", // 외곽선
  w: "#f2f6ff", // 이빨 · 눈빛
  s: "#e8b88c", // 피부
  h: "#241d33", // 머리카락
  a: "#38456f", // 갑옷
  b: "#5a6ca6", // 갑옷 밝은 면
  g: "#ffd75e", // 금장식
  c: "#6fe4ff", // 마력
  p: "#2a1f4a", // 망토
  r: "#ff4d5e", // 붉은 눈
  G: "#7cc242", // 고블린 초록
  D: "#46731f", // 고블린 그늘
  T: "#5fd2c0", // 슬라임
  t: "#2f8f83", // 슬라임 그늘
  B: "#5f7fd3", // 마법사 로브
  N: "#33487e", // 로브 그늘
  O: "#e2662f", // 돌진병
  o: "#9c3d16", // 돌진병 그늘
  P: "#b06cff", // 마왕
  Q: "#6a2fb0", // 마왕 그늘
  m: "#ff9a2e", // 화염
};

export interface SpriteDef {
  /** 도트 하나를 화면 몇 픽셀로 찍을지 — 정수라야 도트가 뭉개지지 않는다 */
  scale: number;
  rows: string[];
}

export const SPRITES = {
  /** 김대원 — 남색 갑옷에 금장식, 가슴에 마력 문양. 몸은 항상 정면이고 무기만 돈다. */
  hero: {
    scale: 2,
    rows: [
      "......kkkk......",
      ".....khhhhk.....",
      "....khhhhhhk....",
      "....khhssshk....",
      "....khskskhk....",
      ".....kssssk.....",
      "...ppkgagkpp....",
      "..ppkbgcgbkpp...",
      "..ppkbbcbbkpp...",
      "..ppkbbbbbkpp...",
      "...pkbaaabkp....",
      "....kbbbbbk.....",
      "....kbbkbbk.....",
      "....kaa.aak.....",
      "....kaa.aak.....",
      "....kgg.ggk.....",
      "...kkaa.aakk....",
      "....kk...kk.....",
    ],
  },
  walker: {
    scale: 2,
    rows: [
      "....kkkkkk......",
      "..kkGGGGGGkk....",
      ".kGGGGGGGGGGk...",
      "kGkGGGGGGGGkGk..",
      "kGGGGGGGGGGGGk..",
      ".kGGrGGGGrGGk...",
      ".kGGGGGGGGGGk...",
      "..kGGwwwwGGk....",
      "...kGGGGGGk.....",
      "...kDGGGGDk.....",
      "..kDDDDDDDDk....",
      ".kDDkDDDDkDDk...",
      ".kDDkDDDDkDDk...",
      "..kkkDDDDkkk....",
      "...kDDk..kDDk...",
      "...kkk....kkk...",
    ],
  },
  spore: {
    scale: 2,
    rows: [
      "....kkkk....",
      "..kkTTTTkk..",
      ".kTTTTTTTTk.",
      ".kTTTTTTTTk.",
      "kTTkTTTTkTTk",
      "kTTkTTTTkTTk",
      "kTTTTTTTTTTk",
      "kTTTTTTTTTTk",
      ".kTtttttttk.",
      ".kttttttttk.",
      "..kttttttk..",
      "...kkkkkk...",
    ],
  },
  watcher: {
    scale: 2,
    rows: [
      ".....kkkk.......",
      "...kkBBBBBkk....",
      "..kBBBBBBBBBk...",
      "..kBBkkkkkBBk...",
      "..kBkscscskBk...",
      "..kBkssssskBk...",
      "..kBBkkkkkBBk...",
      ".kBBBBBBBBBBBk..",
      ".kBBBNNNNNBBBk..",
      ".kBBNNNNNNNBBk..",
      ".kBNNNNNNNNNBk..",
      ".kNNNNNNNNNNNk..",
      ".kNNNNNNNNNNNk..",
      "..kNNNNNNNNNk...",
      "..kkNNNNNNNkk...",
      "....kkkkkkk.....",
    ],
  },
  charger: {
    scale: 2,
    rows: [
      ".kk........kk...",
      ".koo......ook...",
      ".koOo....oOok...",
      "..kOOkkkkkOOk...",
      "..kOOOOOOOOOk...",
      ".kOOrOOOOrOOOk..",
      ".kOOOOOOOOOOOk..",
      ".kOOwwwwwwwOOk..",
      "..kOOOOOOOOOk...",
      ".koooooooooook..",
      ".kooookkkoooook.",
      ".koookoookoook..",
      "..kookoookook...",
      "..kkok...kokk...",
      "...kok...kok....",
      "...kkk...kkk....",
    ],
  },
  splitter: {
    scale: 2,
    rows: [
      ".....kkkkk......",
      "...kkGGGkGGkk...",
      "..kGGGGGkGGGGk..",
      ".kGGGGGGkGGGGGk.",
      ".kGGkGGGkGGGkGk.",
      "kGGGGGGGkGGGGGGk",
      "kGGGGGGGkGGGGGGk",
      "kGGGGGGGkGGGGGGk",
      "kGDDDDDDkDDDDDGk",
      ".kDDDDDDkDDDDDk.",
      ".kDDDDDDkDDDDDk.",
      "..kDDDDDkDDDDk..",
      "..kDDDDDkDDDDk..",
      "...kDDDDkDDDk...",
      "....kkDDkDDkk...",
      "......kkkkk.....",
    ],
  },
  boss: {
    scale: 4,
    rows: [
      "........kkkk........",
      ".kk....kkPPkk....kk.",
      ".kQk..kkPPPPkk..kQk.",
      ".kQQk.kPPPPPPk.kQQk.",
      "..kQQkkPPPPPPkkQQk..",
      "..kQQPPPPPPPPPPQQk..",
      "...kPPPPPPPPPPPPk...",
      "..kPPPmPPPPPPmPPPk..",
      "..kPPPPPPPPPPPPPPk..",
      "..kPPPwwwwwwwwPPPk..",
      "..kPPPPPPPPPPPPPPk..",
      "...kQPPPPPPPPPPQk...",
      "...kQQPPPPPPPPQQk...",
      "..kQQQQPPPPPPQQQQk..",
      "..kQQQQQQQQQQQQQQk..",
      ".kQQQQQQQQQQQQQQQQk.",
      ".kQQQQQQQQQQQQQQQQk.",
      "..kQQQQQQQQQQQQQQk..",
      "...kkQQQQQQQQQQkk...",
      ".....kkkkkkkkkk.....",
    ],
  },
} as const satisfies Record<string, SpriteDef>;

export type SpriteId = keyof typeof SPRITES;
