-- Migration 20261105103630 · infra_renovation_issues
-- Exported from the Supabase migration history (applied in production).

alter table public.centre_infrastructure add column if not exists renovation_issues jsonb not null default '[]'::jsonb;
