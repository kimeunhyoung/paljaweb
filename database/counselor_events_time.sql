-- Run in Supabase SQL Editor (counselor_events.sql 실행 후).
-- 중요 일정에 시작 시각(선택) — HH:MM, 30분 전 푸시용.

alter table public.counselor_events
  add column if not exists event_time text;

-- 푸시 중복 발송 방지 (30분 전 알림 등)
create table if not exists public.counselor_push_sent (
  dedupe_key text primary key,
  counselor_id uuid not null references auth.users (id) on delete cascade,
  sent_at timestamptz not null default now()
);

create index if not exists counselor_push_sent_counselor_id_idx
  on public.counselor_push_sent (counselor_id);

alter table public.counselor_push_sent enable row level security;

-- 서비스 역할(크론)만 쓰므로 클라이언트 정책 없음
