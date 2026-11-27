-- Migration 20261106162154 · cohort_centre_counts_and_trainers
-- Exported from the Supabase migration history (applied in production).

alter table public.advanced_cohort_centres
  add column if not exists enrolled integer not null default 0 check (enrolled >= 0),
  add column if not exists graduated integer not null default 0 check (graduated >= 0);
create unique index if not exists advanced_cohort_centres_cohort_centre_key on public.advanced_cohort_centres (cohort_id, centre_id);
create table if not exists public.advanced_cohort_trainers (
  cohort_id uuid not null,
  centre_id text not null,
  trainer_id uuid not null references public.advanced_trainers(id) on delete cascade,
  primary key (cohort_id, centre_id, trainer_id),
  foreign key (cohort_id, centre_id) references public.advanced_cohort_centres(cohort_id, centre_id) on delete cascade
);
alter table public.advanced_cohort_trainers enable row level security;
create policy "read cohort trainers" on public.advanced_cohort_trainers for select using (true);
create policy "write cohort trainers" on public.advanced_cohort_trainers for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and (p.role = 'ggg' or (p.role = 'partner' and 'advanced' = any(p.section_access)))))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and (p.role = 'ggg' or (p.role = 'partner' and 'advanced' = any(p.section_access)))));
