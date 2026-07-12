-- Supabase SQL Editor에서 실행 — 베이직 7일 이용권 AI 한도(5) 구분용
-- basic30 결제 시 profiles.basic_pass_license_id 에 라이선스 id 저장

alter table public.profiles
  add column if not exists basic_pass_license_id uuid;

comment on column public.profiles.basic_pass_license_id is
  '베이직 7일 이용권 lifecode_licenses.id. 있으면 Basic AI 한도 5(월 구독 10과 구분)';

create index if not exists profiles_basic_pass_license_idx
  on public.profiles (basic_pass_license_id)
  where basic_pass_license_id is not null;
