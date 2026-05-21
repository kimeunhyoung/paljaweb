-- Supabase SQL Editor — 라이프코드 단품 상품 등급 (상담사 허브 ON/OFF)
-- basic: 분석만 | counselor: 분석 + 상담사 허브 + 고객 카드

alter table public.lifecode_licenses
  add column if not exists product_tier text not null default 'basic';

alter table public.lifecode_licenses
  drop constraint if exists lifecode_licenses_product_tier_check;

alter table public.lifecode_licenses
  add constraint lifecode_licenses_product_tier_check
  check (product_tier in ('basic', 'counselor'));

comment on column public.lifecode_licenses.product_tier is
  'basic=분석만, counselor=상담사 허브·고객카드 포함 (등록 가격별)';

create index if not exists lifecode_licenses_product_tier_idx
  on public.lifecode_licenses (product_tier);
