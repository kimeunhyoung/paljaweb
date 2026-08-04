-- Run in Supabase SQL Editor (Dashboard → SQL).
-- 상담사(Professional) 전용 고객별 세션 기록 — RLS로 본인 행만 접근.
-- 사전 준비: counselor_clients.sql 을 먼저 실행해 두어야 합니다.

create table if not exists public.counselor_sessions (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references public.counselor_clients (id) on delete cascade,
  session_date date not null default current_date,
  summary text,
  next_appointment date,
  created_at timestamptz not null default now()
);

create index if not exists counselor_sessions_counselor_id_idx
  on public.counselor_sessions (counselor_id);
create index if not exists counselor_sessions_client_id_idx
  on public.counselor_sessions (client_id);

alter table public.counselor_sessions enable row level security;

drop policy if exists "counselor_sessions_select_own" on public.counselor_sessions;
drop policy if exists "counselor_sessions_insert_own" on public.counselor_sessions;
drop policy if exists "counselor_sessions_update_own" on public.counselor_sessions;
drop policy if exists "counselor_sessions_delete_own" on public.counselor_sessions;

create policy "counselor_sessions_select_own"
  on public.counselor_sessions for select
  using (auth.uid() = counselor_id);

create policy "counselor_sessions_insert_own"
  on public.counselor_sessions for insert
  with check (auth.uid() = counselor_id);

create policy "counselor_sessions_update_own"
  on public.counselor_sessions for update
  using (auth.uid() = counselor_id)
  with check (auth.uid() = counselor_id);

create policy "counselor_sessions_delete_own"
  on public.counselor_sessions for delete
  using (auth.uid() = counselor_id);

-- 주제·다음 포인트 컬럼: counselor_sessions_extend.sql 을 이어서 실행하세요.
