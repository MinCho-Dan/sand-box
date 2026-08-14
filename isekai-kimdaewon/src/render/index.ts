import { HUD_H } from "../config";
import { state } from "../core/state";
import { touch } from "../core/inputState";
import { rnd } from "../core/util";
import { clearScreen, ctx } from "./ctx";
import { drawButtons, drawControlBand, drawHUD, drawOverlays } from "./hud";
import { drawCard, drawDead, drawEnding, drawRank, drawShop, drawStory, drawTitle } from "./screens";
import { drawBullets, drawEnemies, drawItems, drawMap, drawParts, drawPlayer, drawPortal } from "./world";

export function draw(): void {
  const on = touch.on;
  ctx.save();
  clearScreen();

  switch (state.scene) {
    case "title":
      drawTitle(on);
      ctx.restore();
      return;
    case "story":
      drawStory(on);
      ctx.restore();
      return;
    case "card":
      drawCard(on);
      ctx.restore();
      return;
    case "shop":
      drawShop(on);
      ctx.restore();
      return;
    case "rank":
      drawRank();
      ctx.restore();
      return;
    case "ending":
      drawEnding();
      ctx.restore();
      return;
    default:
      break;
  }

  // 아레나는 HUD 아래 전용 공간에 그린다. 월드 좌표 (0,0)~(W,AH) 가 여기로 옮겨진다.
  ctx.translate(0, HUD_H);
  if (state.shake > 0) {
    ctx.translate(rnd(-state.shake, state.shake) * 0.4, rnd(-state.shake, state.shake) * 0.4);
  }
  drawMap();
  drawItems();
  drawPortal(on);
  drawEnemies();
  drawBullets();
  if (state.scene !== "bossdown") drawPlayer();
  drawParts();
  ctx.restore();

  drawHUD();
  drawControlBand(on);
  drawOverlays(on);
  if (state.scene === "dead") drawDead();
  else if (state.scene === "play") void drawButtons; // 플레이 중에는 캔버스 버튼이 없다
}
