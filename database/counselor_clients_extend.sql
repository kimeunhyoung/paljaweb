-- Run in Supabase SQL Editor (Dashboard → SQL).
-- 상담사 고객 카드 확장 컬럼 — 기존 counselor_clients 테이블에 안전하게 추가.
-- 기존 행과 호환되며, 여러 번 실행해도 안전합니다(if not exists).

alter table public.counselor_clients
  add column if not exists phone text;

alter table public.counselor_clients
  add column if not exists tags text;

alter table public.counselor_clients
  add column if not exists next_appointment date;

-- 출생 시간 (점성학 차트용, 선택). 'HH:MM' 형태로 저장.
alter table public.counselor_clients
  add column if not exists birth_time text;
