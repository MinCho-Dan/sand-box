import { AUDIO_LABEL, cycleAudio, getAudioMode, sfx } from "../audio";
import { H, W } from "../config";
import { beginChapter, gotoCard, markSeen, newGame, setScene, state } from "../core/state";
import type { UiButton, UpgradeId } from "../types";
import { fetchRanking, rankOn } from "./ranking";
import { buyUpgrade, shopButtons } from "./shop";

/** 화면 아무 데나 탭해서 넘어갈 수 있는 씬.
 *  타이틀은 버튼이 명확히 있으므로 제외한다(랭킹을 보려다 게임이 시작되면 곤란). */
export const SCENE_TAP = new Set(["story", "card"]);

export function sceneButtons(): UiButton[] {
  const s = state.scene;

  if (s === "title") {
    const out: UiButton[] = [
      // 키 아트를 최대한 가리지 않도록 화면 맨 아래에 붙인다
      { id: "start", kind: "go", x: W / 2 - 110, y: 848, w: 220, h: 56, label: "게임 시작" },
      { id: "sound", kind: "sound", x: W / 2 + 6, y: 912, w: 160, h: 40, label: AUDIO_LABEL[getAudioMode()] },
    ];
    if (rankOn()) out.push({ id: "rank", kind: "rank", x: W / 2 - 166, y: 912, w: 160, h: 40, label: "랭킹 보기" });
    else out[1].x = W / 2 - 80;
    return out;
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
      if (b.id === "start") startRun();
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
  }
}

function startRun(): void {
  newGame();
  state.storyIdx = 0;
  setScene("story", 0.4);
}

/** 씬 진행 입력(탭 / Enter) 처리 */
export function handleAdvance(): void {
  const s = state.scene;
  if (s === "title") {
    startRun();
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
