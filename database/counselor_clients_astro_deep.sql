-- 점성학 주제별 심화(재물·연애·일·학업) 고객 카드 저장
-- Supabase SQL Editor에서 한 번 실행하세요.

alter table public.counselor_clients
  add column if not exists astro_deep jsonb;

alter table public.counselor_clients
  add column if not exists astro_deep_updated_at timestamptz;

comment on column public.counselor_clients.astro_deep is
  '점성학 주제별 심화 AI 결과 JSON: { money, love, career, study }';
