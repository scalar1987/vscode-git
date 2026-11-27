-- Migration 20261125152357 · greenpreneur_cohort_evidence_url
-- Exported from the Supabase migration history (applied in production).

-- One evidence link per Greenpreneur cohort (folder with the registration and completion proof).
alter table public.greenpreneur_cohorts add column if not exists evidence_url text;
