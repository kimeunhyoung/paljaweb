-- Supabase Dashboard → SQL Editor 에서 한 번 실행
-- 회원 가입 유입 경로(첫 방문 페이지·referrer·UTM) 저장

alter table public.profiles
  add column if not exists signup_landing_page text,
  add column if not exists signup_referrer text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term text,
  add column if not exists utm_content text,
  add column if not exists signup_attribution_at timestamptz;

comment on column public.profiles.signup_landing_page is '가입 전 첫 방문 페이지 경로 (예: /numerology-calendar.html)';
comment on column public.profiles.signup_referrer is '가입 전 첫 방문 시 document.referrer';
comment on column public.profiles.utm_source is 'UTM source (예: google, naver, instagram)';
comment on column public.profiles.utm_medium is 'UTM medium (예: cpc, organic, social)';
comment on column public.profiles.utm_campaign is 'UTM campaign';
comment on column public.profiles.utm_term is 'UTM term (광고 키워드 등)';
comment on column public.profiles.utm_content is 'UTM content';
comment on column public.profiles.signup_attribution_at is '유입 정보 최초 캡처 시각';

-- auth.users INSERT 시 user_metadata.palja_attribution → profiles 복사
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attr jsonb := coalesce(new.raw_user_meta_data->'palja_attribution', '{}'::jsonb);
begin
  insert into public.profiles (
    id,
    full_name,
    plan,
    signup_landing_page,
    signup_referrer,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    signup_attribution_at
  )
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      '사용자'
    ),
    'free',
    nullif(left(trim(v_attr->>'landingPage'), 300), ''),
    nullif(left(trim(v_attr->>'referrer'), 500), ''),
    nullif(left(trim(v_attr->>'utmSource'), 120), ''),
    nullif(left(trim(v_attr->>'utmMedium'), 120), ''),
    nullif(left(trim(v_attr->>'utmCampaign'), 200), ''),
    nullif(left(trim(v_attr->>'utmTerm'), 200), ''),
    nullif(left(trim(v_attr->>'utmContent'), 200), ''),
    case
      when nullif(trim(v_attr->>'capturedAt'), '') is not null
        then nullif(trim(v_attr->>'capturedAt'), '')::timestamptz
      when v_attr <> '{}'::jsonb then now()
      else null
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
