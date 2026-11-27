-- Migration 20261125131757 · review_change_timestamps
-- Exported from the Supabase migration history (applied in production).

-- Change timestamps for the two tables that could not tell when they changed.
-- Existing rows get the review baseline (end of 2026-11-25 UTC), so they stay out of the queue; new and changed rows get now().
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

alter table public.advanced_cohort_centres
  add column if not exists updated_at timestamptz not null default '2026-11-25 23:59:59+00';
alter table public.advanced_cohort_centres alter column updated_at set default now();
drop trigger if exists touch_updated_at on public.advanced_cohort_centres;
create trigger touch_updated_at before insert or update on public.advanced_cohort_centres
  for each row execute function public.touch_updated_at();

alter table public.greenpreneur_cohorts
  add column if not exists updated_at timestamptz not null default '2026-11-25 23:59:59+00';
alter table public.greenpreneur_cohorts alter column updated_at set default now();
drop trigger if exists touch_updated_at on public.greenpreneur_cohorts;
create trigger touch_updated_at before insert or update on public.greenpreneur_cohorts
  for each row execute function public.touch_updated_at();
