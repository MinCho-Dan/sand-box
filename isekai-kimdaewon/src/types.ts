export type Scene =
  | "title"
  | "story"
  | "card"
  | "shop"
  | "rank"
  | "play"
  | "bossdown"
  | "dead"
  | "ending";

export type EnemyType = "walker" | "spore" | "watcher" | "charger" | "splitter" | "boss";
export type ToolId = "driver" | "saw" | "hammer" | "grinder";
export type WeaponId = "wrench" | ToolId;
export type UpgradeId = "hp" | "food" | "atk" | "spd" | "dash";

export interface Vec {
  x: number;
  y: number;
}

export interface Body extends Vec {
  r: number;
}

export interface Player extends Body {
  face: number;
  hp: number;
  hunger: number;
  atkCd: number;
  swing: number;
  dashCd: number;
  dashT: number;
  dvx: number;
  dvy: number;
  inv: number;
  hurtT: number;
  supplies: number;
}

export interface Enemy extends Body {
  type: EnemyType;
  hp: number;
  maxhp: number;
  spd: number;
  hit: number;
  cd: number;
  touch: number;
  phase: number;
  wob: number;
  /** 돌진병 전용: 0 접근 / 1 예고 / 2 돌진 */
  mode: number;
  windT: number;
  rushT: number;
  aim: number;
}

export interface Bullet extends Body {
  vx: number;
  vy: number;
  dmg: number;
  life: number;
}

export type ItemType = "supply" | "food" | "medkit" | "gem" | "batt" | "tool";

export interface Item extends Body {
  type: ItemType;
  t: number;
  label?: string;
  val?: number;
  tool?: ToolId;
}

export interface Particle extends Vec {
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  sz?: number;
  text?: string;
  size?: number;
}

export interface Portal extends Body {
  t: number;
}

export type Grid = number[][];

export type RunMode = "story" | "endless";

export interface GameState {
  scene: Scene;
  mode: RunMode;
  sceneLock: number;
  time: number;
  runTime: number;
  seqT: number;
  cardT: number;
  storyIdx: number;
  shake: number;
  flash: number;
  fade: number;
  chapterIdx: number;
  pendingChapter: number;
  /** 스테이지 시작 시점의 적 수 — 진행도 막대의 분모 */
  spawn0: number;
  kills: number;
  score: number;
  /** 점수 내역 — 결과 화면에서 어디서 얼마를 벌었는지 보여준다 */
  sc: { kills: number; items: number; time: number };
  gems: number;
  up: Record<UpgradeId, number>;
  tool: ToolId | null;
  battery: number;
  seen: Set<EnemyType>;
  player: Player;
  map: Grid;
  enemies: Enemy[];
  items: Item[];
  bullets: Bullet[];
  parts: Particle[];
  portal: Portal | null;
  toast: string;
  toastT: number;
  saved: boolean;
  submitted: boolean;
}

export interface UiButton {
  id: string;
  kind: "buy" | "go" | "restart" | "rank" | "close" | "sound" | "control";
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

export interface ScoreRow {
  nick: string;
  score: number;
  stage: number;
  kills: number;
}
