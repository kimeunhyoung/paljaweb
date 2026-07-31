-- 테스트 결제 후 플랜이 올라간 계정을 Free로 되돌릴 때 (Supabase SQL Editor)
-- 이메일을 본인 테스트 계정으로 바꿔서 실행하세요.

-- 예: kpntestcode@gmail.com
update public.profiles p
set
  plan = 'free',
  plan_active_until = null,
  professional_payment_key = null,
  toss_billing_key = null,
  subscription_cycle = null,
  subscription_cancel_at_period_end = false,
  subscription_amount = null
from auth.users u
where p.id = u.id
  and u.email = 'kpntestcode@gmail.com';

-- 적용된 결제 기록도 지우면 같은 paymentId로 재테스트 시 중복 방지 해제됨 (선택)
-- delete from public.toss_applied_payments
-- where user_id = (select id from auth.users where email = 'kpntestcode@gmail.com');
