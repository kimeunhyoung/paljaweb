-- Run in Supabase SQL Editor (counselor_push.sql 실행 후).
-- 일정 알림 시간을 상담사별(구독별)로 설정 (한국 시간 0~23시, 기본 9시).

alter table public.counselor_push_subscriptions
  add column if not exists morning_hour smallint not null default 9;

alter table public.counselor_push_subscriptions
  drop constraint if exists counselor_push_morning_hour_range;

alter table public.counselor_push_subscriptions
  add constraint counselor_push_morning_hour_range
  check (morning_hour >= 0 and morning_hour <= 23);
