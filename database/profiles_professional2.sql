-- @deprecated profiles_plan_special.sql 사용 — plan = 'special'
-- 이 파일은 하위 호환용. Supabase 에서는 special 로 부여하세요.

-- Private: 상담사(Professional) 전체 + 인생리듬 + 타로 타임라인
-- 공개 결제 없음. Supabase 에서 plan 을 수동 부여합니다.

-- update public.profiles
-- set plan = 'special', plan_active_until = '2099-12-31T14:59:59+00'
-- where id = (select id from auth.users where email = 'friend@example.com' limit 1);
