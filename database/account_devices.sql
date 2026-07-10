-- 계정당 등록 기기 (단품·체험 등) — 최대 4대
-- Run in Supabase SQL Editor.

create table if not exists public.account_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id text not null
    check (char_length(device_id) between 8 and 128),
  label text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, device_id)
);

create index if not exists account_devices_user_idx
  on public.account_devices (user_id, last_seen_at desc);

comment on table public.account_devices is
  '로그인 계정에 등록된 브라우저/기기. 단품·체험·월 구독 공통, 계정당 최대 4대.';

alter table public.account_devices enable row level security;

drop policy if exists "account_devices_deny_all" on public.account_devices;
create policy "account_devices_deny_all"
  on public.account_devices for all
  using (false)
  with check (false);
