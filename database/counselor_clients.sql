-- Run in Supabase SQL Editor (Dashboard → SQL).
-- 상담사(Professional) 전용 고객 카드 — RLS로 본인 행만 접근.

create table if not exists public.counselor_clients (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  legal_name text,
  birth_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists counselor_clients_counselor_id_idx
  on public.counselor_clients (counselor_id);

alter table public.counselor_clients enable row level security;

drop policy if exists "counselor_clients_select_own" on public.counselor_clients;
drop policy if exists "counselor_clients_insert_own" on public.counselor_clients;
drop policy if exists "counselor_clients_update_own" on public.counselor_clients;
drop policy if exists "counselor_clients_delete_own" on public.counselor_clients;

create policy "counselor_clients_select_own"
  on public.counselor_clients for select
  using (auth.uid() = counselor_id);

create policy "counselor_clients_insert_own"
  on public.counselor_clients for insert
  with check (auth.uid() = counselor_id);

create policy "counselor_clients_update_own"
  on public.counselor_clients for update
  using (auth.uid() = counselor_id)
  with check (auth.uid() = counselor_id);

create policy "counselor_clients_delete_own"
  on public.counselor_clients for delete
  using (auth.uid() = counselor_id);
