-- Run in Supabase SQL Editor.
-- 질문점·내 차트로 묻기 → 상담사 고객 카드「질문 이력」연결
-- counselor_clients 삭제 시 질문 기록은 남기고 연결만 해제 (set null)

alter table public.prashna_readings
  add column if not exists client_id uuid references public.counselor_clients (id) on delete set null;

create index if not exists prashna_readings_client_asked_idx
  on public.prashna_readings (client_id, asked_at desc)
  where client_id is not null;
