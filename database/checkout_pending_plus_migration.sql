-- checkout_pending.plan: pro → plus 마이그레이션 + 제약 갱신
-- Supabase SQL Editor에서 순서대로 실행 (UPDATE 전에 제약을 먼저 제거해야 함)

-- 1) 어떤 값이 있는지 확인 (선택)
-- select plan, count(*) from public.checkout_pending group by plan;

-- 2) 제약 먼저 제거
alter table public.checkout_pending drop constraint if exists checkout_pending_plan_check;

-- 3) 예전 plan 이름 정리 (pro = 현재 plus)
update public.checkout_pending
set plan = 'plus'
where plan = 'pro';

-- 4) 새 제약 추가
alter table public.checkout_pending add constraint checkout_pending_plan_check
  check (plan in ('basic', 'plus', 'professional'));

-- (선택) 오래된 결제 대기 행만 정리 — 전체 삭제해도 서비스에 영향 없음
-- delete from public.checkout_pending where created_at < now() - interval '24 hours';
