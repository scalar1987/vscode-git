-- Migration 20261105163947 · advanced_cohorts_end_and_registered
-- Exported from the Supabase migration history (applied in production).

alter table advanced_cohorts add column if not exists end_date date; alter table advanced_cohorts add column if not exists enrolled integer not null default 0 check (enrolled >= 0);
