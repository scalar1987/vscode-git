-- Migration 20261110164249 · pitch_competition_programme_level
-- Exported from the Supabase migration history (applied in production).

alter table public.greenpreneur_pitch_editions drop column if exists cohort_id;
