-- Migration 20261110161626 · drop_infra_from_review
-- Exported from the Supabase migration history (applied in production).

drop trigger if exists reset_review_centre_infrastructure on public.centre_infrastructure;
delete from public.data_reviews where table_name = 'centre_infrastructure';
alter table public.data_reviews drop constraint if exists data_reviews_table_name_check;
alter table public.data_reviews add constraint data_reviews_table_name_check check (table_name in (
  'advanced_trainers','advanced_cohort_centres',
  'tot_trainees','centre_training_basic','centre_basic_modules',
  'greenpreneur_cohorts','greenpreneur_pitch_results'));
