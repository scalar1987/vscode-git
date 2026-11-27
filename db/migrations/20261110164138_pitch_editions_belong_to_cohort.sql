-- Migration 20261110164138 · pitch_editions_belong_to_cohort
-- Exported from the Supabase migration history (applied in production).

alter table public.greenpreneur_pitch_editions add column if not exists cohort_id uuid references public.greenpreneur_cohorts(id) on delete cascade;
-- no competitions exist yet, so every competition gets a cohort from now on
alter table public.greenpreneur_pitch_editions alter column cohort_id set not null;
