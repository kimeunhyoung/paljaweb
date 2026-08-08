-- 고객 카드: 출생지 직접 위·경도 (도시 목록에 없는 경우)
-- Supabase SQL Editor에서 실행. 여러 번 실행해도 안전합니다.

alter table public.counselor_clients
  add column if not exists birth_lat double precision;

alter table public.counselor_clients
  add column if not exists birth_lng double precision;
