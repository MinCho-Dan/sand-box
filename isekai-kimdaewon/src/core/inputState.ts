/** 입력 플래그만 담는다. 다른 모듈을 import 하지 않아야
 *  state <-> input 순환 의존이 생기지 않는다. */
export const keys: Record<string, boolean> = Object.create(null);

export const input = {
  /** 씬을 진행시키는 입력(1프레임 소비) */
  enterEdge: false,
  /** 공격 입력(1프레임 소비) */
  attackEdge: false,
};

export const touch = {
  /** 터치 UI 표시 여부 = 마지막으로 쓴 입력 장치가 터치인가 */
  on: false,
  active: false,
  x: 0,
  y: 0,
  dash: false,
};

export const down = (...codes: string[]) => codes.some((c) => keys[c]);

/** 조이스틱을 강제로 놓게 한다. input.ts 가 실제 구현을 꽂아준다. */
export let releaseStick: () => void = () => {};
export const setStickReleaser = (fn: () => void) => {
  releaseStick = fn;
};

/** 씬이 바뀔 때 남아 있던 입력을 전부 버린다. */
export function clearPendingInput(): void {
  input.enterEdge = false;
  input.attackEdge = false;
  touch.dash = false;
  releaseStick();
}
