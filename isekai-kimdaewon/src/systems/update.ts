import { sfx } from "../audio";
import type { Mood } from "../audio";
import { stepParticles } from "../core/fx";
import { freeSpots, nearestFree } from "../core/map";
import { MW } from "../config";
import { beginChapter, currentChapter, finishRun, gotoShop, markSeen, setScene, state, toast } from "../core/state";
import { dist } from "../core/util";
import { updateBullets, updatePlayer } from "./combat";
import { updateEnemies } from "./enemies";
import { updateItems } from "./items";

export function currentMood(): Mood {
  const s = state.scene;
  if (s === "play" || s === "bossdown") {
    return currentChapter(state.chapterIdx).kind === "boss" ? "boss" : "play";
  }
  return "menu";
}

export function update(dt: number): void {
  state.time += dt;
  state.sceneLock = Math.max(0, state.sceneLock - dt);
  state.shake = Math.max(0, state.shake - dt * 40);
  state.flash = Math.max(0, state.flash - dt * 3);
  state.fade = Math.max(0, state.fade - dt * 1.6);
  if (state.toastT > 0) state.toastT -= dt;

  if (state.scene === "card") {
    state.cardT += dt;
    if (state.cardT > 3.6) {
      markSeen(state.pendingChapter);
      beginChapter();
    }
    return;
  }

  if (state.scene === "bossdown") {
    state.seqT += dt;
    stepParticles(state, dt);
    if (state.seqT > 1.4) finishRun("ending");
    return;
  }

  if (state.scene !== "play") {
    stepParticles(state, dt);
    return;
  }

  const p = state.player;
  const ch = currentChapter(state.chapterIdx);

  updatePlayer(dt);
  updateItems(dt);
  updateEnemies(dt);
  if (state.scene !== "play") return; // 보스 격파로 씬이 바뀌었다
  updateBullets(dt);
  stepParticles(state, dt);

  /* 클리어 판정 */
  if (!state.portal) {
    const done = ch.kind === "scavenge" ? p.supplies >= (ch.need ?? 0) : state.enemies.length === 0;
    if (done) {
      const spots = freeSpots(state.map, p, 150);
      const s = spots.length
        ? spots[Math.floor(Math.random() * spots.length)]
        : nearestFree(state.map, Math.floor(MW / 2), 3);
      state.portal = { x: s.x, y: s.y, r: 22, t: 0 };
      state.flash = 0.8;
      state.shake = 14;
      sfx("clear");
      toast(state.chapterIdx === 0 ? "허공에 동그란 유리창이 떠올랐다" : "다음 게이트가 열렸다");
    }
  } else {
    state.portal.t += dt;
    if (dist(p, state.portal) < p.r + state.portal.r) {
      if (state.mode === "story" && state.chapterIdx === 0) {
        state.storyIdx = 1;
        setScene("story", 0.7);
      } else {
        gotoShop(state.chapterIdx + 1);
      }
    }
  }

  if (p.hp <= 0) {
    p.hp = 0;
    state.shake = 20;
    sfx("over");
    finishRun("dead");
  }
}
