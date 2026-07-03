-- Supabase SQL Editor에서 실행 — 상담사 15일 체험권 ↔ 팔자연구소 로그인 연동
-- counselor30 라이선스를 profiles.plan=professional(만료=license.expires_at)로 연결

alter table public.profiles
  add column if not exists counselor_trial_license_id uuid;

alter table public.profiles
  add column if not exists counselor_trial_device_id text;

comment on column public.profiles.counselor_trial_license_id is '15일 체험권 lifecode_licenses.id. 있으면 체험 Professional';
comment on column public.profiles.counselor_trial_device_id is '체험 연결 시 등록한 기기 ID (lifecode_device_id와 동일 키)';

alter table public.profiles
  drop constraint if exists profiles_counselor_trial_device_len;

alter table public.profiles
  add constraint profiles_counselor_trial_device_len
  check (counselor_trial_device_id is null or char_length(counselor_trial_device_id) between 8 and 128);

create index if not exists profiles_counselor_trial_license_idx
  on public.profiles (counselor_trial_license_id)
  where counselor_trial_license_id is not null;

alter table public.lifecode_licenses
  add column if not exists linked_user_id uuid references auth.users (id) on delete set null;

comment on column public.lifecode_licenses.linked_user_id is '팔자연구소 계정에 체험 연결된 user id';

create index if not exists lifecode_licenses_linked_user_idx
  on public.lifecode_licenses (linked_user_id)
  where linked_user_id is not null;
