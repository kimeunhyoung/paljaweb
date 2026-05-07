-- Supabase SQL Editor에서 실행 — 사용자 분석/리포트 사용량 집계용

alter table public.profiles
  add column if not exists analysis_count integer not null default 0;

alter table public.profiles
  add column if not exists saved_report_count integer not null default 0;

comment on column public.profiles.analysis_count is '라이프코드 분석 실행 누적 횟수';
comment on column public.profiles.saved_report_count is 'PDF 저장(리포트 저장) 누적 횟수';
