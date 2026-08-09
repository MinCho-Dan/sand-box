-- 이세계전사 김대원 · 랭킹 테이블
--
-- 사용법: Supabase 대시보드 → 왼쪽 메뉴 SQL Editor → New query →
--         아래 내용을 통째로 붙여넣고 Run.
--
-- 여러 번 실행해도 안전하게 작성했습니다. 이미 만드셨더라도 다시 실행하면
-- 닉네임 중복 처리(최고점만 유지)가 추가로 적용됩니다.

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

-- ── 닉네임당 최고 기록 1건만 유지 ──────────────────────────────
-- 이미 쌓인 중복이 있다면 먼저 정리한다 (최고점, 동점이면 먼저 올린 것만 남김)
delete from public.scores a
using public.scores b
where a.nick = b.nick
  and (b.score > a.score or (b.score = a.score and b.id < a.id));

create unique index if not exists scores_nick_key on public.scores (nick);

-- 같은 닉네임으로 등록하면
--   · 새 점수가 더 높으면 기존 기록을 삭제하고 갱신
--   · 새 점수가 더 낮거나 같으면 등록 자체를 버림(기존 최고점 유지)
-- security definer 라 RLS 에 delete 정책이 없어도 트리거 안에서는 정리할 수 있다.
-- 클라이언트는 여전히 남의 기록을 지울 수 없다.
create or replace function public.keep_best_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row public.scores%rowtype;
begin
  new.nick := btrim(new.nick);

  select * into old_row from public.scores where nick = new.nick limit 1;
  if found then
    if old_row.score >= new.score then
      return null;   -- 기존 기록이 더 높다 → 이번 등록은 무시
    end if;
    delete from public.scores where id = old_row.id;
  end if;

  return new;
end;
$$;

drop trigger if exists scores_keep_best on public.scores;
create trigger scores_keep_best
before insert on public.scores
for each row execute function public.keep_best_score();

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
-- · 닉네임 비교는 앞뒤 공백만 제거한 뒤 정확히 일치하는지로 판단합니다.
--   대소문자는 구분합니다 ("Kim" 과 "kim" 은 다른 사람으로 취급).
-- · 닉네임은 캔버스에 그려지므로 HTML 로 해석되지 않습니다 (XSS 위험 없음).
-- · IP 단위 요청 제한은 이 SQL 로는 불가능합니다. 필요해지면 Edge Function 을
--   앞단에 두는 방식으로 확장할 수 있습니다.
