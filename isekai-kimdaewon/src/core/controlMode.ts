import { loadControlMode, saveControlMode } from "./save";

export type ControlMode = "drag" | "fixed";

/** drag  = 터치한 자리에 조이스틱이 나타나 손가락을 따라간다 (기존 방식)
 *  fixed = 화면 고정 위치의 십자키. 8방향으로 스냅되는 디지털 입력이다. */
let mode: ControlMode = loadControlMode();

export const getControlMode = () => mode;
export const CONTROL_LABEL: Record<ControlMode, string> = {
  drag: "이동: 드래그형",
  fixed: "이동: 고정 십자키",
};

export function cycleControlMode(): void {
  mode = mode === "drag" ? "fixed" : "drag";
  saveControlMode(mode);
}
