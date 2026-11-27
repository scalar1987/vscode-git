-- Migration 20261125145650 · advanced_cohort_evidence_url
-- Exported from the Supabase migration history (applied in production).

-- One evidence link per advanced cohort (folder with the registration and graduation proof).
-- Required by the app before a cohort is added or its centre details are saved.
alter table public.advanced_cohorts add column if not exists evidence_url text;
