-- AI 크레딧: 결제 paid 표시와 실제 지급 완료를 분리 (지급 실패 복구용)
-- Supabase SQL Editor에서 실행

alter table public.ai_credit_orders
  add column if not exists fulfilled_at timestamptz;

comment on column public.ai_credit_orders.fulfilled_at is
  '보너스 크레딧(및 달력 패스) 지급이 끝난 시각. null이면 paid여도 미지급 → fulfill 재시도.';

-- 이미 정상 지급된 기존 paid 건은 재지급되지 않도록 백필
update public.ai_credit_orders
set fulfilled_at = coalesce(paid_at, created_at)
where status = 'paid'
  and fulfilled_at is null;
