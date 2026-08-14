import type { EnemyType } from "../types";

export interface Chapter {
  name: string;
  theme: string;
  kind: "scavenge" | "combat" | "boss";
  flavor: string;
  need?: number;
  spawn?: Partial<Record<EnemyType, number>>;
  /** 보급 스테이지에서 배회하는 잡몹 — 완료 조건에는 영향을 주지 않는다.
   *  "그냥 줍기만 하는" 스테이지에 최소한의 긴장을 준다. */
  ambient?: Partial<Record<EnemyType, number>>;
}

export const CHAPTERS: Chapter[] = [
  { name: "폐허의 마트", theme: "mart", kind: "scavenge", need: 6, ambient: { spore: 2 },
    flavor: "유통기한은 400년쯤 지났다. 그래도 먹는다." },
  { name: "싱그러운 들판", theme: "field", kind: "combat", spawn: { walker: 8 },
    flavor: "풀냄새가 난다. 진짜 풀이다." },
  { name: "마수의 숲", theme: "field", kind: "combat", spawn: { walker: 7, spore: 9 },
    flavor: "나무 사이에서 무언가 미끄러지는 소리." },
  { name: "버려진 광산", theme: "mine", kind: "combat", spawn: { walker: 5, charger: 5 },
    flavor: "갱도 안쪽에서 발 구르는 소리가 울린다." },
  { name: "폐성의 회랑", theme: "stone", kind: "combat", spawn: { walker: 5, spore: 7, watcher: 4 },
    flavor: "무너진 성벽 너머에서 주문 소리가 들린다." },
  { name: "얼어붙은 호수", theme: "ice", kind: "combat", spawn: { spore: 8, splitter: 5, charger: 4 },
    flavor: "얼음 아래에서 무언가 갈라지고 있다." },
  { name: "마왕성 앞마당", theme: "dark", kind: "combat", spawn: { walker: 6, charger: 5, watcher: 4, splitter: 4 },
    flavor: "문 앞을 지키는 것들이 전부 모여 있다." },
  { name: "마왕성", theme: "dark", kind: "boss",
    flavor: "공기가 일그러진다. 마트에서 봤던 그 느낌." },
];

/** 무한모드의 라운드 구성. story 의 CHAPTERS 와 달리 끝이 없어
 *  파도 번호(wave, 0-based)로부터 매번 계산해 낸다.
 *  적 종류는 점진적으로 풀리고(도감 카드가 자연히 그 순간에만 뜬다),
 *  수는 파도가 오를수록 늘어난다. 마왕(boss) 타입은 절대 쓰지 않는다 —
 *  그건 엔딩을 트리거하는 전용 타입이라 무한모드에 섞으면 런이 끝나버린다. */
export function endlessChapter(wave: number): Chapter {
  const w = wave + 1;
  const pool: EnemyType[] = ["walker"];
  if (w >= 2) pool.push("spore");
  if (w >= 4) pool.push("charger");
  if (w >= 6) pool.push("watcher");
  if (w >= 8) pool.push("splitter");

  const total = 5 + Math.floor(w * 1.6);
  const spawn: Partial<Record<EnemyType, number>> = {};
  for (let k = 0; k < total; k++) {
    const t = pool[k % pool.length];
    spawn[t] = (spawn[t] ?? 0) + 1;
  }

  const themes = ["field", "mine", "stone", "ice", "dark"];
  return {
    name: `${w}라운드`,
    theme: themes[wave % themes.length],
    kind: "combat",
    flavor: w % 5 === 0 ? "몰려드는 무리가 유독 거세다." : "다음 파도가 몰려온다.",
    spawn,
  };
}

/** 보급품 종류별 서사 텍스트 — 1스테이지 픽업 시 표시된다.
 *  "그냥 줍기만 한다"는 인상을 줄이려고 카운터 대신 이걸 보여준다. */
export const SUPPLY_FLAVOR: Record<string, string> = {
  통조림: '"세계 최후의 스팸" — 라벨이 그렇게 말한다.',
  생수: "김빠진 생수. 그래도 마실 수 있다.",
  라면: "봉지가 삭아 부스러진다. 스프만 겨우 건진다.",
  건빵: "이빨이 나갈 것 같지만, 오늘의 식량이다.",
};

/** 광산에서 첫 전동공구를 확정 지급한다 */
export const FIRST_TOOL_CHAPTER = 3;
/** 전동공구가 드랍되기 시작하는 챕터 */
export const TOOL_DROP_FROM = 3;

export const STORY = [
`단기 4361년.

유례없는 핵전쟁으로
대륙은 잿더미가 되었다.

두 발로 서 있는 생명체는
이제 단 하나.

김대원.

그는 오늘도 빈 마트를 돈다.
유통기한이 지난 통조림,
김빠진 생수.

그것으로 하루를 더 산다.`,
`선반 사이의 공기가 일그러진다.

허공에 동그란 유리창 하나.
그 너머로, 더는 볼 수 없다고
믿었던 싱그러운 들판이 비친다.

풀냄새. 바람. 살아 있는 초록.

김대원은 렌치를 고쳐 쥐고,
유리창에 손을 댄다 —`,
];

export const ENDING_TEXT = [
  "보라색 빛이 꺼지자,",
  "성 밖으로 바람이 불어 들어왔다.",
  "풀냄새였다.",
  "",
  "김대원은 렌치를 내려놓고",
  "들판을 바라본다.",
  "",
  "돌아갈 마트도,",
  "유통기한 지난 통조림도 없다.",
  "",
  "인류의 마지막 생존자는 —",
  "이세계의 첫 번째 전사가 되었다.",
];
