-- 이미 lifecode_licenses.sql 실행한 뒤 Supabase SQL Editor에서 한 번 더 실행

alter table public.lifecode_licenses
  add column if not exists code_rotated_at timestamptz;

comment on column public.lifecode_licenses.code_rotated_at is '코드 재설정 시각. 이전에 발급된 세션 쿠키 무효화용';

alter table public.lifecode_access_log drop constraint if exists lifecode_access_log_event_check;

alter table public.lifecode_access_log add constraint lifecode_access_log_event_check
  check (event in (
    'activate_ok',
    'activate_denied_revoked',
    'activate_denied_expired',
    'activate_denied_device',
    'activate_denied_invalid',
    'session_ok',
    'session_denied',
    'logout',
    'device_reset',
    'code_regenerate'
  ));
