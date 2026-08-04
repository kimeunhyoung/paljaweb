-- Run in Supabase SQL Editor (Dashboard → SQL).
-- 상담사 허브 「운영 섹터」— 간단 매출 장부.
-- 사전 준비: counselor_clients.sql 을 먼저 실행해 두어야 합니다 (매출의 client_id FK).
--
-- 참고: counselor_snippets(후기·멘트) 테이블이 이미 있어도 무방합니다. UI에서는 더 이상 쓰지 않습니다.

-- ── 간단 매출 장부 ──
create table if not exists public.counselor_sales (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid references public.counselor_clients (id) on delete set null,
  sale_date date not null default current_date,
  amount integer not null check (amount >= 0),
  channel text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists counselor_sales_counselor_id_idx
  on public.counselor_sales (counselor_id);
create index if not exists counselor_sales_date_idx
  on public.counselor_sales (counselor_id, sale_date);

alter table public.counselor_sales enable row level security;

drop policy if exists "counselor_sales_select_own" on public.counselor_sales;
drop policy if exists "counselor_sales_insert_own" on public.counselor_sales;
drop policy if exists "counselor_sales_update_own" on public.counselor_sales;
drop policy if exists "counselor_sales_delete_own" on public.counselor_sales;

create policy "counselor_sales_select_own"
  on public.counselor_sales for select
  using (auth.uid() = counselor_id);

create policy "counselor_sales_insert_own"
  on public.counselor_sales for insert
  with check (auth.uid() = counselor_id);

create policy "counselor_sales_update_own"
  on public.counselor_sales for update
  using (auth.uid() = counselor_id)
  with check (auth.uid() = counselor_id);

create policy "counselor_sales_delete_own"
  on public.counselor_sales for delete
  using (auth.uid() = counselor_id);

comment on table public.counselor_sales is '상담사 간단 매출 장부 (회차·금액·채널)';
comment on column public.counselor_sales.channel is '유입/결제 채널 (예: 카톡, 인스타, 소개)';
comment on column public.counselor_sales.amount is '금액(원), 정수';
