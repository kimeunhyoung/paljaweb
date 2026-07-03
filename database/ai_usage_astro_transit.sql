-- 기존 ai_usage_cache에 astro_transit feature 추가 (Supabase SQL Editor에서 실행)
alter table public.ai_usage_cache drop constraint if exists ai_usage_cache_feature_check;
alter table public.ai_usage_cache add constraint ai_usage_cache_feature_check
  check (feature in ('astro', 'astro_transit', 'name_opinion', 'name_recommend'));
