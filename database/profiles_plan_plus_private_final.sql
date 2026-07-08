-- Supabase SQL Editor
-- Finalize plan keys after migration stabilization.
-- This removes legacy slugs from the CHECK constraint.

alter table public.profiles drop constraint if exists profiles_plan_check;

alter table public.profiles
  add constraint profiles_plan_check
  check (plan in (
    'free',
    'basic',
    'plus',
    'professional',
    'private'
  ));

comment on column public.profiles.plan is
  'free | basic | plus | professional | private';
