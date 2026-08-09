/** 게임 모듈은 브라우저 전역을 몇 개 건드리므로 import 전에 채워둔다.
 *  (vitest 의 setupFiles 는 테스트 파일보다 먼저 실행된다) */
const store = new Map<string, string>();

(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};

export const lsStore = store;

/** 캔버스 컨텍스트 스텁 — 모든 메서드가 자기 자신을 돌려주는 프록시.
 *  그리기 경로를 실제로 실행시켜 런타임 오류를 잡는 게 목적이다. */
export const fakeCtx: any = new Proxy(
  {},
  {
    get(_t, p) {
      if (p === "canvas") return { width: 540, height: 972 };
      return () => fakeCtx;
    },
    set() {
      return true;
    },
  },
);
