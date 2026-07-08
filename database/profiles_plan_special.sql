-- Supabase SQL Editor — profiles.plan 에 Private(special) 등급 허용
-- professional2 는 하위 호환 별칭 (코드에서 special 로 읽음)

-- 기존 제약이 있으면 제거 (이름이 다를 수 있어 information_schema 로도 확인 가능)
alter table public.profiles drop constraint if exists profiles_plan_check;

-- 예전 값 → special 로 통일 (선택 실행, 이미 special 이면 무시)
update public.profiles
set plan = 'special'
where plan = 'professional2';

alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('free', 'basic', 'pro', 'professional', 'special'));

comment on column public.profiles.plan is
  'free | basic | pro | professional | special(Private·수동부여·인생리듬·타로 타임라인·상담사허브)';

-- 예: Private 부여
-- update public.profiles
-- set
--   plan = 'special',
--   plan_active_until = '2099-12-31T14:59:59+00'
-- where id = (
--   select id from auth.users where email = 'friend@example.com' limit 1
-- );

-- 부여 확인
-- select p.id, u.email, p.plan, p.plan_active_until
-- from public.profiles p
-- join auth.users u on u.id = p.id
-- where p.plan = 'special';
