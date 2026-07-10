-- Supabase SQL Editor — 라이프코드 건별(1회) 결제 주문
-- PortOne payment_id ↔ 발급 라이선스 매핑 (중복 지급 방지)

create table if not exists public.lifecode_orders (
  payment_id text primary key,
  product_key text not null,
  amount integer not null,
  buyer_email text,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed')),
  license_id uuid references public.lifecode_licenses (id) on delete set null,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.lifecode_orders
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists lifecode_orders_status_idx
  on public.lifecode_orders (status, created_at desc);

create index if not exists lifecode_orders_user_idx
  on public.lifecode_orders (user_id, created_at desc)
  where user_id is not null;

alter table public.lifecode_orders enable row level security;

comment on table public.lifecode_orders is '라이프코드 단품 1회 결제 — 결제 완료 시 로그인 계정에 이용권 연결';
comment on column public.lifecode_orders.user_id is '결제한 팔자연구소 로그인 계정';
