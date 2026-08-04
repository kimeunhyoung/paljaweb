-- Run in Supabase SQL Editor (Dashboard → SQL).
-- 상담 세션 기록 확장 — 주제·다음 상담 포인트 (재상담 이어가기).
-- 사전 준비: counselor_sessions.sql 실행 후.
-- 여러 번 실행해도 안전합니다(if not exists).

alter table public.counselor_sessions
  add column if not exists topic text;

alter table public.counselor_sessions
  add column if not exists next_focus text;

comment on column public.counselor_sessions.topic is '이번 회차 주제/질문 (짧게)';
comment on column public.counselor_sessions.next_focus is '다음 상담에서 이어갈 포인트';
