-- AI 1회/팩 결제용 보너스 크레딧 + 주문
-- Run in Supabase SQL Editor.

alter table public.profiles
  add column if not exists ai_credits_bonus integer not null default 0
    check (ai_credits_bonus >= 0);

comment on column public.profiles.ai_credits_bonus is
  '구매한 AI 크레딧(선불). 플랜 한도와 합산되며, 사용 시 차감.';

alter table public.profiles
  add column if not exists calendar_pass_until timestamptz;

comment on column public.profiles.calendar_pass_until is
  '수비학 달력 단건 이용권 만료 시각. Basic 미만이어도 만료 전까지 달력만 이용.';

create table if not exists public.ai_credit_orders (
  payment_id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  product_key text not null,
  amount integer not null check (amount > 0),
  credits integer not null check (credits > 0),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'cancelled')),
  buyer_email text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists ai_credit_orders_user_idx
  on public.ai_credit_orders (user_id, created_at desc);

alter table public.ai_credit_orders enable row level security;

drop policy if exists "ai_credit_orders_deny_all" on public.ai_credit_orders;
create policy "ai_credit_orders_deny_all"
  on public.ai_credit_orders for all
  using (false)
  with check (false);
