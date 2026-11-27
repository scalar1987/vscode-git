-- Migration 20261106165035 · advanced_cohorts_start_date
-- Exported from the Supabase migration history (applied in production).

alter table public.advanced_cohorts add column if not exists start_date date;
update public.advanced_cohorts set start_date = (start_month || '-01')::date where start_date is null and start_month is not null;
