-- Supabase SQL Editor
-- Safe migration: keep legacy slugs AND add new slugs.
-- legacy: pro/special/professional2
-- new:    plus/private

alter table public.profiles drop constraint if exists profiles_plan_check;

alter table public.profiles
  add constraint profiles_plan_check
  check (plan in (
    'free',
    'basic',
    'pro', 'plus',
    'professional',
    'special', 'private', 'professional2'
  ));

comment on column public.profiles.plan is
  'free | basic | plus(=pro) | professional | private(=special) ; legacy pro/special/professional2 allowed for compatibility';

-- Optional data migration (run after compatibility deploy)
-- update public.profiles set plan = 'plus' where plan = 'pro';
-- update public.profiles set plan = 'private' where plan in ('special','professional2');
