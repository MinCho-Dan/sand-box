import { AUDIO_LABEL, cycleAudio, getAudioMode, sfx } from "../audio";
import { H, W } from "../config";
import { CONTROL_LABEL, cycleControlMode, getControlMode } from "../core/controlMode";
import { beginChapter, gotoCard, markSeen, newGame, setScene, startEndless, state } from "../core/state";
import type { UiButton, UpgradeId } from "../types";
import { fetchRanking, rankOn } from "./ranking";
import { buyUpgrade, shopButtons } from "./shop";

/** 화면 아무 데나 탭해서 넘어갈 수 있는 씬.
 *  타이틀은 버튼이 명확히 있으므로 제외한다(랭킹을 보려다 게임이 시작되면 곤란). */
export const SCENE_TAP = new Set(["story", "card"]);

export function sceneButtons(): UiButton[] {
  const s = state.scene;

  if (s === "title") {
    // 1행 — 모드 선택. 키 아트를 최대한 가리지 않도록 화면 맨 아래에 붙인다.
    const out: UiButton[] = [
      { id: "start", kind: "go", x: W / 2 - 110, y: 850, w: 104, h: 54, label: "스토리 모드" },
      { id: "endless", kind: "go", x: W / 2 + 6, y: 850, w: 104, h: 54, label: "무한 모드" },
    ];
    // 2행 — 설정. 있는 것만 채워 넣고 한가운데 정렬한다.
    const row2: UiButton[] = [];
    if (rankOn()) row2.push({ id: "rank", kind: "rank", x: 0, y: 914, w: 164, h: 40, label: "랭킹 보기" });
    row2.push({ id: "control", kind: "control", x: 0, y: 914, w: 164, h: 40, label: CONTROL_LABEL[getControlMode()] });
    row2.push({ id: "sound", kind: "sound", x: 0, y: 914, w: 164, h: 40, label: AUDIO_LABEL[getAudioMode()] });
    const gap = 8;
    const totalW = row2.length * 164 + (row2.length - 1) * gap;
    let x = W / 2 - totalW / 2;
    for (const b of row2) {
      b.x = x;
      x += 164 + gap;
    }
    return [...out, ...row2];
  }

  if (s === "rank") return [{ id: "close", kind: "close", x: W / 2 - 85, y: H - 104, w: 170, h: 52, label: "닫기" }];
  if (s === "shop") return shopButtons();
  // 엔딩은 본문이 아래까지 내려오므로 버튼을 더 낮게 둔다
  if (s === "ending") return [{ id: "restart", kind: "restart", x: W / 2 - 110, y: H - 118, w: 220, h: 60 }];
  if (s === "dead") return [{ id: "restart", kind: "restart", x: W / 2 - 110, y: H / 2 + 96, w: 220, h: 60 }];
  return [];
}

export function hitButton(gx: number, gy: number): UiButton | null {
  for (const b of sceneButtons()) {
    if (gx >= b.x && gx <= b.x + b.w && gy >= b.y && gy <= b.y + b.h) return b;
  }
  return null;
}

export function pressButton(b: UiButton): void {
  switch (b.kind) {
    case "buy":
      if (buyUpgrade(b.id as UpgradeId)) {
        state.flash = 0.25;
        sfx("buy");
      }
      break;
    case "go":
      sfx("ui");
      if (b.id === "start") startStory();
      else if (b.id === "endless") startEndless();
      else gotoCard();
      break;
    case "restart":
      sfx("ui");
      newGame();
      break;
    case "rank":
      sfx("ui");
      void fetchRanking();
      setScene("rank", 0.3);
      break;
    case "close":
      sfx("ui");
      newGame();
      setScene("title", 0.3);
      break;
    case "sound":
      cycleAudio();
      break;
    case "control":
      cycleControlMode();
      break;
  }
}

function startStory(): void {
  newGame();
  state.storyIdx = 0;
  setScene("story", 0.4);
}

/** 씬 진행 입력(탭 / Enter) 처리 */
export function handleAdvance(): void {
  const s = state.scene;
  if (s === "title") {
    startStory();
  } else if (s === "story") {
    if (state.storyIdx === 0) {
      state.pendingChapter = 0;
      markSeen(0);
      beginChapter();
    } else {
      state.pendingChapter = 1;
      setScene("shop", 0.8);
    }
  } else if (s === "card") {
    markSeen(state.pendingChapter);
    beginChapter();
  } else if (s === "dead" || s === "ending") {
    newGame();
  }
}
