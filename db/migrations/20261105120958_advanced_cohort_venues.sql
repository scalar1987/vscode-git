-- Migration 20261105120958 · advanced_cohort_venues
-- Exported from the Supabase migration history (applied in production).

-- Centres where each cohort is delivered (a cohort can run in several centres)
create table if not exists public.advanced_cohort_centres (
  cohort_id uuid not null references public.advanced_cohorts(id) on delete cascade,
  centre_id text not null references public.centres(id) on delete cascade,
  primary key (cohort_id, centre_id)
);
alter table public.advanced_cohort_centres enable row level security;
create policy "read cohort venues" on public.advanced_cohort_centres for select using (true);
create policy "write cohort venues" on public.advanced_cohort_centres for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid()
    and (p.role = 'ggg' or (p.role = 'partner' and 'advanced' = any (p.section_access)))))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid()
    and (p.role = 'ggg' or (p.role = 'partner' and 'advanced' = any (p.section_access)))));
