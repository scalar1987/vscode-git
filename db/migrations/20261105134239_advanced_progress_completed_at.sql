-- Migration 20261105134239 · advanced_progress_completed_at
-- Exported from the Supabase migration history (applied in production).

alter table advanced_cohort_progress add column if not exists completed_at timestamptz;
