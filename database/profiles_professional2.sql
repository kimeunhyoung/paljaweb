-- Professional2(스페셜): 상담사(Professional) 전체 + 인생리듬 + 타로 타임라인
-- 공개 결제·요금제 페이지 없음. Supabase에서 plan을 수동 부여합니다.
-- professional2 = 상담사 허브·CRM·AI 120/월 + 피라미드 리듬 (Pro·일반 Professional에는 피라미드 미노출)

-- 예: 아는 상담사 계정에 Professional2 부여
-- update public.profiles
-- set
--   plan = 'professional2',
--   plan_active_until = '2099-12-31T14:59:59+00'
-- where id = (
--   select id from auth.users where email = 'friend@example.com' limit 1
-- );

-- 부여 확인
-- select p.id, u.email, p.plan, p.plan_active_until
-- from public.profiles p
-- join auth.users u on u.id = p.id
-- where p.plan = 'professional2';
