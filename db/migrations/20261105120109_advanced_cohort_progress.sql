-- Migration 20261105120109 · advanced_cohort_progress
-- Exported from the Supabase migration history (applied in production).

-- Replace the per-centre version: monthly progress is tracked per cohort (not per centre)
drop table if exists public.advanced_progress;

create table public.advanced_cohort_progress (
  item_key text primary key,
  cohort text not null check (cohort in ('DigiFemmes', 'Green Business')),
  month text not null,
  completed boolean not null default false,
  completed_date date,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.advanced_cohort_progress enable row level security;

create policy "read cohort progress" on public.advanced_cohort_progress for select using (true);

-- GGGI and DigiFemme (advanced section) can tick items
create policy "write cohort progress" on public.advanced_cohort_progress for all
  using (exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and (p.role = 'ggg' or (p.role = 'partner' and 'advanced' = any (p.section_access)))
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and (p.role = 'ggg' or (p.role = 'partner' and 'advanced' = any (p.section_access)))
  ));
