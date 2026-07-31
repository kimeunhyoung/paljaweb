-- 구독 청구 고정가 (그랜드파더). Supabase SQL Editor에서 실행.
-- 가입·첫 결제 시점의 금액을 저장하고, 이후 정기 갱신에 그대로 사용합니다.
-- 정식가 인상 후에도 기존 구독자는 이 금액으로 유지됩니다.

alter table public.profiles
  add column if not exists subscription_amount integer;

comment on column public.profiles.subscription_amount is
  '정기결제 고정 청구액(원). null이면 현재 PLAN_AMOUNTS 사용. 해지·Free 전환 시 null.';

-- 이미 구독 중인 계정: 현재 출시 할인가로 백필 (인상 전에 보호)
update public.profiles
set subscription_amount = case
  when plan = 'basic' and coalesce(subscription_cycle, 'monthly') = 'annual' then 7920 * 12
  when plan = 'basic' then 9900
  when plan = 'plus' and coalesce(subscription_cycle, 'monthly') = 'annual' then 15920 * 12
  when plan = 'plus' then 19900
  when plan = 'professional' and coalesce(subscription_cycle, 'monthly') = 'annual' then 23920 * 12
  when plan = 'professional' then 29900
  else subscription_amount
end
where plan in ('basic', 'plus', 'professional')
  and toss_billing_key is not null
  and subscription_amount is null;
