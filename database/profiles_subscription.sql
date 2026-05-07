-- Supabase SQL Editor에서 실행 — Professional 구독 만료·토스 웹훅 연동용

alter table public.profiles
  add column if not exists plan_active_until timestamptz;

alter table public.profiles
  add column if not exists professional_payment_key text;

alter table public.profiles
  add column if not exists toss_billing_key text;

comment on column public.profiles.plan_active_until is 'Professional 이용 만료 시각. null이면 만료 제한 없음(기존 데이터·데모 등)';
comment on column public.profiles.professional_payment_key is '마지막으로 승인된 Professional 결제 paymentKey (환불 웹훅 매칭용)';
comment on column public.profiles.toss_billing_key is '자동결제(빌링) 연동 시 빌링키 — BILLING_DELETED 처리용';

-- 결제 건별 1회만 플랜 연장 적용 (웹훅 재전송·중복 방지)
create table if not exists public.toss_applied_payments (
  payment_key text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  order_id text not null,
  applied_at timestamptz not null default now()
);

create index if not exists toss_applied_payments_user_id_idx
  on public.toss_applied_payments (user_id);

alter table public.toss_applied_payments enable row level security;
-- 정책 없음 = 클라이언트는 접근 불가. service_role만 REST로 사용.
