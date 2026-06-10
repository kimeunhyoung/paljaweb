-- Supabase SQL Editor에서 실행 — KPN MxIssueNO 32byte 제한용 짧은 paymentId 매핑

create table if not exists public.checkout_pending (
  payment_id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  plan text not null check (plan in ('basic', 'pro', 'professional')),
  cycle text not null check (cycle in ('monthly', 'annual')),
  created_at timestamptz not null default now()
);

create index if not exists checkout_pending_user_id_idx
  on public.checkout_pending (user_id);

alter table public.checkout_pending enable row level security;
