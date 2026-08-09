-- 이세계전사 김대원 · 랭킹 테이블
--
-- 사용법: Supabase 대시보드 → 왼쪽 메뉴 SQL Editor → New query →
--         아래 내용을 통째로 붙여넣고 Run.
--
-- 여러 번 실행해도 안전하게 작성했습니다.

create table if not exists public.scores (
  id         bigint generated always as identity primary key,
  nick       text        not null,
  score      integer     not null,
  stage      smallint    not null,
  kills      integer     not null,
  run_time   real        not null,
  created_at timestamptz not null default now(),

  -- 서버 측 상한 검증.
  -- 클라이언트에서 점수를 보내는 구조라 조작을 완전히 막을 수는 없습니다.
  -- 이 제약은 "지나가다 장난치는" 수준의 말도 안 되는 값만 거르는 용도입니다.
  -- 실측 클리어 점수가 약 10,700 이므로 100,000 은 충분히 넉넉한 상한입니다.
  constraint nick_len    check (char_length(btrim(nick)) between 1 and 12),
  constraint score_range check (score >= 0 and score <= 100000),
  constraint stage_range check (stage between 1 and 8),
  constraint kills_range check (kills >= 0 and kills <= 2000),
  constraint time_range  check (run_time >= 5 and run_time <= 7200)
);

-- 랭킹 조회 (score 내림차순, 동점이면 먼저 올린 사람이 위) 최적화
create index if not exists scores_rank_idx on public.scores (score desc, created_at asc);

-- ── RLS ──────────────────────────────────────────────────────────
-- 읽기와 등록만 허용합니다. update / delete 정책을 만들지 않으므로
-- anon 키를 가진 사람도 남의 기록을 고치거나 지울 수 없습니다.
alter table public.scores enable row level security;

drop policy if exists "public read" on public.scores;
create policy "public read" on public.scores
  for select to anon using (true);

drop policy if exists "public insert" on public.scores;
create policy "public insert" on public.scores
  for insert to anon with check (true);

-- ── 참고 ─────────────────────────────────────────────────────────
-- · 닉네임은 캔버스에 그려지므로 HTML 로 해석되지 않습니다 (XSS 위험 없음).
-- · IP 단위 요청 제한은 이 SQL 로는 불가능합니다. 필요해지면 Edge Function 을
--   앞단에 두는 방식으로 확장할 수 있습니다.
-- · 기록을 지우고 싶으면 대시보드 Table Editor 에서 직접 삭제하세요
--   (service_role 권한이 필요하므로 클라이언트에서는 불가능합니다).
