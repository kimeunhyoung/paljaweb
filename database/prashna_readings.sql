-- Run in Supabase SQL Editor.
-- 질문점(프라슈나) 기록 · 일반 회원 카테고리 쿨다운용
-- 서버(service role)는 RLS를 우회합니다.
-- 클라이언트(anon/authenticated)는 본인 row만 SELECT 가능.

create table if not exists public.prashna_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  question text not null,
  city text,
  asked_at timestamptz not null,
  conclusion text,
  tone text,
  result_json jsonb,
  client_label text,
  created_at timestamptz not null default now()
);

create index if not exists prashna_readings_user_cat_asked_idx
  on public.prashna_readings (user_id, category, asked_at desc);

alter table public.prashna_readings enable row level security;

drop policy if exists "prashna_readings_deny_all" on public.prashna_readings;
drop policy if exists "prashna_readings_select_own" on public.prashna_readings;
drop policy if exists "prashna_readings_insert_own" on public.prashna_readings;

-- 본인 것만 조회
create policy "prashna_readings_select_own"
  on public.prashna_readings for select
  to authenticated
  using (auth.uid() = user_id);

-- 본인 것만 삽입 (서버 service role이 주로 씀 · 클라 직접 insert 시에도 본인만)
create policy "prashna_readings_insert_own"
  on public.prashna_readings for insert
  to authenticated
  with check (auth.uid() = user_id);
