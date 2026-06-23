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

create index if not exists lifecode_orders_status_idx
  on public.lifecode_orders (status, created_at desc);

alter table public.lifecode_orders enable row level security;

comment on table public.lifecode_orders is '라이프코드 단품 1회 결제 — 결제 완료 시 접속 코드(라이선스) 자동 발급';
