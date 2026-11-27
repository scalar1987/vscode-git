-- Migration 20261105162032 · greenpreneur_session_details
-- Exported from the Supabase migration history (applied in production).

alter table greenpreneur_cohort_progress add column if not exists sessions integer check (sessions is null or sessions >= 0); alter table greenpreneur_cohort_progress add column if not exists note text; alter table greenpreneur_cohort_progress add column if not exists mentors integer check (mentors is null or mentors >= 0);
