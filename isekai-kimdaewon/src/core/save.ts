/** localStorage 접근을 한곳에 모은다.
 *  file:// 이나 프라이버시 모드에서 던질 수 있어 전부 try/catch 로 감싼다. */
const BEST_KEY = "kimdaewon.best";
const NICK_KEY = "kimdaewon.nick";
const AUDIO_KEY = "kimdaewon.audio";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 저장 실패는 게임 진행에 영향을 주지 않는다 */
  }
}

let best = Number(read(BEST_KEY) ?? 0) || 0;

export const getBest = () => best;
export function setBest(v: number): void {
  best = v;
  write(BEST_KEY, String(v));
}

export const getNick = () => read(NICK_KEY) ?? "";
export const setNick = (v: string) => write(NICK_KEY, v);

export function loadAudioMode(): number {
  const v = Number(read(AUDIO_KEY));
  return v === 1 || v === 2 ? v : 0;
}
export const saveAudioMode = (v: number) => write(AUDIO_KEY, String(v));
