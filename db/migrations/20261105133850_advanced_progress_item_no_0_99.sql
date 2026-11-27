-- Migration 20261105133850 · advanced_progress_item_no_0_99
-- Exported from the Supabase migration history (applied in production).

alter table advanced_cohort_progress drop constraint advanced_cohort_progress_item_no_check; alter table advanced_cohort_progress add constraint advanced_cohort_progress_item_no_check check (item_no >= 0 and item_no <= 99);
