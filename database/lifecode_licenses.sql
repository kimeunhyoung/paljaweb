-- Supabase SQL Editor에서 실행 — 라이프코드 단품 라이선스 (/lifecode)
-- 클라이언트(anon/authenticated)는 RLS 정책 없음 → REST 직접 접근 불가.
-- Express server.js + SUPABASE_SERVICE_ROLE_KEY 로만 읽기/쓰기.

-- ─────────────────────────────────────────────────────────────
-- 라이선스 (접속 코드 1개 = 행 1개, 기기 1대 바인딩)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.lifecode_licenses (
  id uuid primary key default gen_random_uuid(),

  -- 평문 코드는 DB에 저장하지 않음. 서버가 SHA-256( pepper + code ) 로 조회.
  code_hash text not null unique,

  -- 관리 화면용 힌트 (예: "LC-****-7K2M"). 필수 아님.
  code_hint text,

  -- active: 사용 가능 | revoked: 관리자 차단
  status text not null default 'active'
    check (status in ('active', 'revoked')),

  -- null 이면 만료 없음
  expires_at timestamptz,

  -- 최초 성공 활성화 시 바인딩. 다른 device_id 로 activate 시 거절.
  device_id text,
  device_bound_at timestamptz,

  -- 구매자 메모, 주문번호 등 (관리용)
  note text,

  -- 코드 재설정 시각 (이전 세션 쿠키 무효화)
  code_rotated_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz,

  constraint lifecode_licenses_device_len
    check (device_id is null or char_length(device_id) between 8 and 128)
);

comment on table public.lifecode_licenses is '라이프코드 단품 접속 코드. 1코드 1기기.';
comment on column public.lifecode_licenses.code_hash is '접속 코드 해시 (평문 미저장)';
comment on column public.lifecode_licenses.code_hint is '관리자 목록용 마스킹 힌트';
comment on column public.lifecode_licenses.device_id is '클라이언트가 생성·보관하는 기기 UUID (localStorage)';

create index if not exists lifecode_licenses_status_idx
  on public.lifecode_licenses (status);

create index if not exists lifecode_licenses_expires_at_idx
  on public.lifecode_licenses (expires_at)
  where expires_at is not null;

create index if not exists lifecode_licenses_last_seen_idx
  on public.lifecode_licenses (last_seen_at desc nulls last);

-- updated_at 자동 갱신
create or replace function public.lifecode_licenses_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lifecode_licenses_updated_at on public.lifecode_licenses;
create trigger lifecode_licenses_updated_at
  before update on public.lifecode_licenses
  for each row execute function public.lifecode_licenses_set_updated_at();

alter table public.lifecode_licenses enable row level security;

-- ─────────────────────────────────────────────────────────────
-- 접속·차단 이벤트 로그 (선택, CS·감사용)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.lifecode_access_log (
  id bigint generated always as identity primary key,
  license_id uuid references public.lifecode_licenses (id) on delete set null,

  event text not null check (event in (
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
  )),

  device_id text,
  detail text,

  created_at timestamptz not null default now()
);

comment on table public.lifecode_access_log is '라이프코드 라이선스 접속 이벤트';

create index if not exists lifecode_access_log_license_id_idx
  on public.lifecode_access_log (license_id, created_at desc);

create index if not exists lifecode_access_log_created_at_idx
  on public.lifecode_access_log (created_at desc);

alter table public.lifecode_access_log enable row level security;
