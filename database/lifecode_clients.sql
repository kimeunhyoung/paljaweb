-- Supabase SQL Editor — 라이프코드 단품 고객 카드 (접속 코드·라이선스별)
-- RLS 없음 → Express service_role API만 접근

create table if not exists public.lifecode_clients (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.lifecode_licenses (id) on delete cascade,
  display_name text not null,
  legal_name text,
  birth_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lifecode_clients_license_id_idx
  on public.lifecode_clients (license_id);

create index if not exists lifecode_clients_license_updated_idx
  on public.lifecode_clients (license_id, updated_at desc);

create or replace function public.lifecode_clients_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lifecode_clients_updated_at on public.lifecode_clients;
create trigger lifecode_clients_updated_at
  before update on public.lifecode_clients
  for each row execute function public.lifecode_clients_set_updated_at();

alter table public.lifecode_clients enable row level security;

comment on table public.lifecode_clients is '라이프코드 단품 — 라이선스(접속코드)별 상담 고객 카드';
