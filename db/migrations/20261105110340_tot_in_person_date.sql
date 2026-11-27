-- Migration 20261105110340 · tot_in_person_date
-- Exported from the Supabase migration history (applied in production).

alter table public.tot_trainees add column if not exists in_person_date date;
