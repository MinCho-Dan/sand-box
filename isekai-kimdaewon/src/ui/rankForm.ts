import { getNick, setNick } from "../core/save";
import { touch } from "../core/inputState";
import { setScene, state } from "../core/state";
import { rankOn, submitScore } from "../systems/ranking";

let form: HTMLElement | null = null;
let nick: HTMLInputElement;
let msg: HTMLElement;
let sub: HTMLElement;

export function setupRankForm(): void {
  form = document.getElementById("rankform");
  if (!form) return;
  nick = document.getElementById("rf-nick") as HTMLInputElement;
  msg = document.getElementById("rf-msg") as HTMLElement;
  sub = document.getElementById("rf-sub") as HTMLElement;
  const go = document.getElementById("rf-go") as HTMLButtonElement;
  const skip = document.getElementById("rf-skip") as HTMLButtonElement;

  nick.value = getNick();

  const close = () => {
    state.submitted = true;
    document.body.classList.remove("asknick");
  };

  skip.addEventListener("click", (e) => {
    e.preventDefault();
    close();
  });

  go.addEventListener("click", async (e) => {
    e.preventDefault();
    const v = nick.value.trim().slice(0, 12);
    if (!v) {
      msg.style.color = "#ff8a8a";
      msg.textContent = "닉네임을 입력해 주세요";
      return;
    }
    go.disabled = skip.disabled = true;
    msg.style.color = "#7fbfa6";
    msg.textContent = "등록 중…";
    try {
      setNick(v);
      await submitScore(v);
      close();
      setScene("rank", 0.3);
    } catch (err) {
      msg.style.color = "#ff8a8a";
      msg.textContent = (err as Error).message || "등록에 실패했습니다";
    } finally {
      go.disabled = skip.disabled = false;
    }
  });

  // 게임 키 입력과 섞이지 않게
  nick.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.code === "Enter") go.click();
  });
  nick.addEventListener("keyup", (e) => e.stopPropagation());
}

/** 표시 조건: 게임이 끝났고, 랭킹이 켜져 있고, 아직 등록/건너뛰기 전이고,
 *  입력 잠금이 풀렸을 때. 잠금을 기다리는 이유는 연타하던 손가락이
 *  폼을 곧바로 넘겨버리는 걸 막기 위함이다. */
export function syncRankForm(): void {
  if (!form) return;
  const over = state.scene === "dead" || state.scene === "ending";
  const show = over && rankOn() && !state.submitted && state.sceneLock <= 0 && state.score > 0;
  const shown = document.body.classList.contains("asknick");

  if (show && !shown) {
    sub.textContent = `점수 ${state.score.toLocaleString("en-US")} · STAGE ${state.chapterIdx + 1}`;
    msg.textContent = "";
    document.body.classList.add("asknick");
    // 모바일은 자동 포커스 시 키보드가 튀어나와 방해된다
    if (!touch.on) setTimeout(() => nick.focus(), 30);
  } else if (!show && !over && shown) {
    document.body.classList.remove("asknick");
  }
}
