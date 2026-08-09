import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../config";
import { state } from "../core/state";
import type { ScoreRow } from "../types";

export const RANK_LIMIT = 20;

export const rankOn = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY && typeof fetch === "function");

export const rank = {
  rows: null as ScoreRow[] | null,
  status: "idle" as "idle" | "loading" | "ok" | "error",
  /** 방금 등록한 내 순위(0-based). -1 이면 없음 */
  mine: -1,
  /** 랭킹 화면에 띄울 안내 (중복 닉네임으로 갱신되지 않은 경우 등) */
  notice: "",
};

const headers = () => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: "Bearer " + SUPABASE_ANON_KEY,
  "Content-Type": "application/json",
});

export async function fetchRanking(): Promise<void> {
  if (!rankOn()) return;
  rank.status = "loading";
  try {
    const url =
      `${SUPABASE_URL}/rest/v1/scores` +
      `?select=nick,score,stage,kills&order=score.desc&order=created_at.asc&limit=${RANK_LIMIT}`;
    const r = await fetch(url, { headers: headers() });
    if (!r.ok) throw new Error("HTTP " + r.status);
    rank.rows = (await r.json()) as ScoreRow[];
    rank.status = "ok";
  } catch {
    rank.status = "error";
    if (!rank.rows) rank.rows = [];
  }
}

export interface SubmitResult {
  /** false = 같은 닉네임의 기존 기록이 더 높아 갱신되지 않음 */
  updated: boolean;
}

export async function submitScore(nick: string): Promise<SubmitResult> {
  const clean = nick.trim();
  const body = {
    nick: clean,
    score: Math.round(state.score),
    stage: state.chapterIdx + 1,
    kills: state.kills,
    run_time: Math.round(state.runTime * 10) / 10,
  };
  // representation 으로 받아야 DB 트리거가 등록을 건너뛴 경우를 구분할 수 있다.
  // (닉네임당 최고점 1건만 남기므로, 더 낮은 점수는 빈 배열이 돌아온다)
  const r = await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
    method: "POST",
    headers: { ...headers(), Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    throw new Error(
      r.status === 401 || r.status === 403
        ? "등록 권한이 없습니다 (RLS 정책 확인)"
        : "등록 실패 (" + r.status + ")",
    );
  }
  let updated = true;
  try {
    const rows = await r.json();
    updated = Array.isArray(rows) ? rows.length > 0 : true;
  } catch {
    /* 본문이 없으면 갱신된 것으로 본다 */
  }

  await fetchRanking();
  rank.mine = (rank.rows ?? []).findIndex((x) => x.nick === clean);
  rank.notice = updated ? "" : "같은 닉네임의 기존 최고 기록이 더 높습니다";
  return { updated };
}
