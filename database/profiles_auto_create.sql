-- Supabase Dashboard → SQL Editor 에서 한 번 실행
-- 가입(auth.users) 시 public.profiles 행 자동 생성 + 기존 유저 백필

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, plan)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      '사용자'
    ),
    'free'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 이미 가입했지만 profiles 가 없는 유저 (Authentication 6명 vs profiles 2명 등)
insert into public.profiles (id, full_name, plan)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    '사용자'
  ),
  'free'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

comment on function public.handle_new_user() is 'auth.users INSERT 시 profiles 행 자동 생성 (plan=free)';
