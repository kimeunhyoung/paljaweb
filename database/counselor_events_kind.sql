-- Run in Supabase SQL Editor (counselor_events.sql / counselor_events_time.sql 이후).
-- 일정 유형: appointment(상담 약속) | personal(개인·세미나·휴무 등)

alter table public.counselor_events
  add column if not exists event_kind text;

update public.counselor_events
set event_kind = 'personal'
where event_kind is null or event_kind = '';

alter table public.counselor_events
  alter column event_kind set default 'personal';

alter table public.counselor_events
  alter column event_kind set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'counselor_events_event_kind_check'
  ) then
    alter table public.counselor_events
      add constraint counselor_events_event_kind_check
      check (event_kind in ('appointment', 'personal'));
  end if;
end $$;
