-- Migration 20261105120454 · advanced_cohorts_with_both_tracks
-- Exported from the Supabase migration history (applied in production).

-- Cohorts (several per year). Each cohort runs ICT and Green Business together.
drop table if exists public.advanced_cohort_progress;

create table public.advanced_cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_month text not null check (start_month ~ '^[0-9]{4}-[0-9]{2}$'),
  created_at timestamptz not null default now()
);

create table public.advanced_cohort_progress (
  cohort_id uuid not null references public.advanced_cohorts(id) on delete cascade,
  track text not null check (track in ('ict', 'green')),
  month_no smallint not null check (month_no between 1 and 4),
  item_no smallint not null check (item_no between 0 and 9),
  completed boolean not null default false,
  completed_date date,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (cohort_id, track, month_no, item_no)
);

alter table public.advanced_cohorts enable row level security;
alter table public.advanced_cohort_progress enable row level security;

create policy "read cohorts" on public.advanced_cohorts for select using (true);
create policy "read cohort progress" on public.advanced_cohort_progress for select using (true);

-- GGGI and DigiFemme (advanced section) can create cohorts and tick items
create policy "write cohorts" on public.advanced_cohorts for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid()
    and (p.role = 'ggg' or (p.role = 'partner' and 'advanced' = any (p.section_access)))))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid()
    and (p.role = 'ggg' or (p.role = 'partner' and 'advanced' = any (p.section_access)))));
create policy "write cohort progress" on public.advanced_cohort_progress for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid()
    and (p.role = 'ggg' or (p.role = 'partner' and 'advanced' = any (p.section_access)))))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid()
    and (p.role = 'ggg' or (p.role = 'partner' and 'advanced' = any (p.section_access)))));
