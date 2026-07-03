-- Run in Supabase SQL Editor.
-- AI 월 크레딧 (점성학·네임코드 공통 풀)

create table if not exists public.ai_usage_monthly (
  user_id uuid not null references auth.users (id) on delete cascade,
  period text not null,
  credits_used integer not null default 0 check (credits_used >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, period)
);

create index if not exists ai_usage_monthly_period_idx
  on public.ai_usage_monthly (period);

create table if not exists public.ai_usage_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  feature text not null check (feature in ('astro', 'astro_transit', 'astro_year', 'numerology_daily', 'numerology_monthly', 'name_opinion', 'name_recommend')),
  cache_key text not null,
  response_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, feature, cache_key)
);

create index if not exists ai_usage_cache_lookup_idx
  on public.ai_usage_cache (user_id, feature, cache_key, created_at desc);

alter table public.ai_usage_monthly enable row level security;
alter table public.ai_usage_cache enable row level security;

-- 서버(service role)만 접근. 클라이언트 직접 조회 없음.
drop policy if exists "ai_usage_monthly_deny_all" on public.ai_usage_monthly;
create policy "ai_usage_monthly_deny_all"
  on public.ai_usage_monthly for all
  using (false)
  with check (false);

drop policy if exists "ai_usage_cache_deny_all" on public.ai_usage_cache;
create policy "ai_usage_cache_deny_all"
  on public.ai_usage_cache for all
  using (false)
  with check (false);

-- 원자적 크레딧 차감 (한도 초과 시 ok=false)
create or replace function public.ai_consume_credits(
  p_user_id uuid,
  p_period text,
  p_cost integer,
  p_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
begin
  if p_cost < 1 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_cost');
  end if;

  insert into public.ai_usage_monthly (user_id, period, credits_used)
  values (p_user_id, p_period, 0)
  on conflict (user_id, period) do nothing;

  update public.ai_usage_monthly
  set
    credits_used = credits_used + p_cost,
    updated_at = now()
  where user_id = p_user_id
    and period = p_period
    and credits_used + p_cost <= p_limit
  returning credits_used into v_used;

  if not found then
    select credits_used into v_used
    from public.ai_usage_monthly
    where user_id = p_user_id and period = p_period;
    return jsonb_build_object(
      'ok', false,
      'reason', 'quota_exceeded',
      'used', coalesce(v_used, 0)
    );
  end if;

  return jsonb_build_object('ok', true, 'used', v_used);
end;
$$;

revoke all on function public.ai_consume_credits(uuid, text, integer, integer) from public;
grant execute on function public.ai_consume_credits(uuid, text, integer, integer) to service_role;
