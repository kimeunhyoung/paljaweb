-- Run in Supabase SQL Editor.
-- 상담사(Professional) 오전 일정 알림용 웹 푸시 구독.

create table if not exists public.counselor_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  morning_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (counselor_id, endpoint)
);

create index if not exists counselor_push_counselor_id_idx
  on public.counselor_push_subscriptions (counselor_id);

alter table public.counselor_push_subscriptions enable row level security;

drop policy if exists "counselor_push_select_own" on public.counselor_push_subscriptions;
drop policy if exists "counselor_push_insert_own" on public.counselor_push_subscriptions;
drop policy if exists "counselor_push_update_own" on public.counselor_push_subscriptions;
drop policy if exists "counselor_push_delete_own" on public.counselor_push_subscriptions;

create policy "counselor_push_select_own"
  on public.counselor_push_subscriptions for select
  using (auth.uid() = counselor_id);

create policy "counselor_push_insert_own"
  on public.counselor_push_subscriptions for insert
  with check (auth.uid() = counselor_id);

create policy "counselor_push_update_own"
  on public.counselor_push_subscriptions for update
  using (auth.uid() = counselor_id)
  with check (auth.uid() = counselor_id);

create policy "counselor_push_delete_own"
  on public.counselor_push_subscriptions for delete
  using (auth.uid() = counselor_id);
