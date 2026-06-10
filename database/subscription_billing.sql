-- Supabase SQL Editor에서 실행 — 정기결제(빌링키) 필드

alter table public.profiles
  add column if not exists subscription_cycle text;

alter table public.profiles
  add column if not exists subscription_cancel_at_period_end boolean not null default false;

comment on column public.profiles.toss_billing_key is 'PortOne 빌링키 (정기결제 자동 갱신용)';
comment on column public.profiles.subscription_cycle is '구독 결제 주기: monthly | annual';
comment on column public.profiles.subscription_cancel_at_period_end is 'true면 현재 이용기간 종료 후 자동 갱신·Free 전환';

create index if not exists profiles_subscription_renew_idx
  on public.profiles (plan_active_until)
  where plan is distinct from 'free'
    and toss_billing_key is not null
    and subscription_cancel_at_period_end = false;
