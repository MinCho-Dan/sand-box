import { cycleAudio, sfx, wakeAudio } from "../audio";
import { CTRL_H, H, W } from "../config";
import { hitButton, pressButton, sceneButtons, SCENE_TAP } from "../systems/ui";
import { getControlMode } from "./controlMode";
import { input, keys, setStickReleaser, touch } from "./inputState";
import { state } from "./state";

/** 고정 십자키의 화면 위치(밴드 안, 왼쪽) */
const ANCHOR_X_FRAC = 0.22;
const ANCHOR_Y_FRAC = 1 - CTRL_H / H / 2;
/** 디지털 입력이라 아날로그보다 이동 반경이 짧아도 된다 */
const FIXED_RADIUS_FRAC = 0.06;
const DRAG_RADIUS_FRAC = 0.1;

/** 씬을 넘기는 입력. 전환 직후 잠금 중이면 통째로 버린다. */
export function requestAdvance(): boolean {
  if (state.sceneLock > 0) return false;
  input.enterEdge = true;
  sfx("ui");
  return true;
}

export function setupInput(canvas: HTMLCanvasElement): void {
  const wrap = document.getElementById("wrap") as HTMLElement;
  const stick = document.getElementById("stick") as HTMLElement;
  const base = stick.querySelector(".base") as HTMLElement;
  const knob = stick.querySelector(".knob") as HTMLElement;

  let stickId: number | null = null;
  let ox = 0;
  let oy = 0;
  let radius = 54;

  /** 터치 UI 는 "마지막으로 쓴 입력 장치"를 따라간다.
   *  한 번 켜두고 끝내면 터치 지원 PC 에서 화면 버튼이 계속 남는다. */
  const setInputMode = (isTouch: boolean) => {
    if (touch.on === isTouch) return;
    touch.on = isTouch;
    document.body.classList.toggle("touch", isTouch);
    if (!isTouch) {
      touch.dash = false;
      endStick();
    }
  };

  const place = (dx: number, dy: number) => {
    base.style.left = ox + "px";
    base.style.top = oy + "px";
    knob.style.left = ox + dx + "px";
    knob.style.top = oy + dy + "px";
  };
  const endStick = () => {
    stickId = null;
    touch.active = false;
    touch.x = 0;
    touch.y = 0;
    stick.classList.remove("on");
  };
  setStickReleaser(endStick);

  if (matchMedia("(pointer: coarse) and (hover: none)").matches) setInputMode(true);

  const toGame = (cx: number, cy: number) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((cx - r.left) / r.width) * W, y: ((cy - r.top) / r.height) * H };
  };

  wrap.addEventListener("pointerdown", (e) => {
    setInputMode(e.pointerType !== "mouse");
    wakeAudio(); // 모바일은 사용자 제스처가 있어야 오디오가 열린다
    e.preventDefault();

    if (state.scene !== "play") {
      if (state.sceneLock > 0) return; // 전환 직후 입력은 통째로 버린다
      const g = toGame(e.clientX, e.clientY);
      const b = hitButton(g.x, g.y);
      if (b) {
        pressButton(b);
        return;
      }
      if (SCENE_TAP.has(state.scene)) requestAdvance();
      return;
    }

    if (e.pointerType === "mouse" || stickId !== null) return;
    const r = wrap.getBoundingClientRect();
    if (e.clientX - r.left > r.width * 0.5) return; // 오른쪽 절반은 버튼 영역
    stickId = e.pointerId;
    try {
      wrap.setPointerCapture(e.pointerId);
    } catch {
      /* 지원하지 않는 브라우저는 무시 */
    }
    const fixed = getControlMode() === "fixed";
    radius = r.width * (fixed ? FIXED_RADIUS_FRAC : DRAG_RADIUS_FRAC);
    if (fixed) {
      // 손가락이 어디를 짚든 십자키는 항상 같은 자리에 나타난다
      ox = r.width * ANCHOR_X_FRAC;
      oy = r.height * ANCHOR_Y_FRAC;
    } else {
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;
    }
    touch.active = true;
    touch.x = 0;
    touch.y = 0;
    stick.classList.add("on");
    place(0, 0);
  });

  wrap.addEventListener("pointermove", (e) => {
    if (e.pointerId !== stickId) return;
    e.preventDefault();
    const r = wrap.getBoundingClientRect();
    let dx = e.clientX - r.left - ox;
    let dy = e.clientY - r.top - oy;
    const d = Math.hypot(dx, dy);

    if (getControlMode() === "fixed") {
      // 아날로그가 아니라 8방향 디지털 입력 — 죽은 영역을 벗어나면 가장 가까운 방향으로 고정된다
      const dead = radius * 0.35;
      if (d < dead) {
        dx = 0; dy = 0; touch.x = 0; touch.y = 0;
      } else {
        const STEP = Math.PI / 4;
        const a = Math.round(Math.atan2(dy, dx) / STEP) * STEP;
        dx = Math.cos(a) * radius;
        dy = Math.sin(a) * radius;
        touch.x = Math.cos(a);
        touch.y = Math.sin(a);
      }
    } else {
      if (d > radius) {
        dx = (dx / d) * radius;
        dy = (dy / d) * radius;
      }
      touch.x = dx / radius;
      touch.y = dy / radius;
    }
    place(dx, dy);
  });

  for (const ev of ["pointerup", "pointercancel"]) {
    wrap.addEventListener(ev, (e) => {
      if ((e as PointerEvent).pointerId === stickId) endStick();
    });
  }

  /* 공격·회피 버튼은 절대 씬을 진행시키지 않는다 */
  const bindBtn = (el: HTMLElement, onDown: () => void, onUp?: () => void) => {
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setInputMode(e.pointerType !== "mouse");
      wakeAudio();
      if (state.scene !== "play") return;
      el.classList.add("press");
      onDown();
    });
    const up = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove("press");
      onUp?.();
    };
    for (const ev of ["pointerup", "pointercancel", "pointerleave"]) el.addEventListener(ev, up);
  };
  bindBtn(document.getElementById("btnAtk") as HTMLElement, () => {
    input.attackEdge = true;
  });
  bindBtn(
    document.getElementById("btnDash") as HTMLElement,
    () => {
      touch.dash = true;
    },
    () => {
      touch.dash = false;
    },
  );

  addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    setInputMode(false); // 키보드를 쓰면 PC 모드로 되돌린다
    if (!keys[e.code]) {
      if (e.code === "Enter") {
        if (state.sceneLock > 0) {
          /* 잠금 중 */
        } else if (state.scene === "shop") {
          const go = sceneButtons().find((b) => b.kind === "go");
          if (go) pressButton(go);
        } else if (SCENE_TAP.has(state.scene) || state.scene === "title") {
          requestAdvance();
        } else if (state.scene === "dead" || state.scene === "ending") {
          input.enterEdge = true;
        }
      }
      if ((e.code === "KeyJ" || e.code === "Space") && state.scene === "play") input.attackEdge = true;
      if (e.code === "KeyM") cycleAudio();
    }
    keys[e.code] = true;
  });
  addEventListener("keyup", (e) => {
    keys[e.code] = false;
  });
  addEventListener("blur", () => {
    for (const k in keys) keys[k] = false;
    touch.dash = false;
  });
}
