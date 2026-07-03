-- Run in Supabase SQL Editor.
-- 상담사 허브 — 상담 외 중요 일정(세미나·휴무·개인 일정 등).

create table if not exists public.counselor_events (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references auth.users (id) on delete cascade,
  event_date date not null,
  title text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists counselor_events_counselor_id_idx
  on public.counselor_events (counselor_id);

create index if not exists counselor_events_date_idx
  on public.counselor_events (counselor_id, event_date);

alter table public.counselor_events enable row level security;

drop policy if exists "counselor_events_select_own" on public.counselor_events;
drop policy if exists "counselor_events_insert_own" on public.counselor_events;
drop policy if exists "counselor_events_update_own" on public.counselor_events;
drop policy if exists "counselor_events_delete_own" on public.counselor_events;

create policy "counselor_events_select_own"
  on public.counselor_events for select
  using (auth.uid() = counselor_id);

create policy "counselor_events_insert_own"
  on public.counselor_events for insert
  with check (auth.uid() = counselor_id);

create policy "counselor_events_update_own"
  on public.counselor_events for update
  using (auth.uid() = counselor_id)
  with check (auth.uid() = counselor_id);

create policy "counselor_events_delete_own"
  on public.counselor_events for delete
  using (auth.uid() = counselor_id);
