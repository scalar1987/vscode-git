-- Migration 20261110155228 · greenpreneur_review_scope_cohorts_only
-- Exported from the Supabase migration history (applied in production).

drop trigger if exists reset_review_greenpreneur_progress on public.greenpreneur_cohort_progress;
drop trigger if exists reset_review_greenpreneur_pitch_results on public.greenpreneur_pitch_results;
drop trigger if exists reset_review_centre_greenpreneur on public.centre_greenpreneur;
drop trigger if exists reset_review_greenpreneur_centres on public.greenpreneur_centres;
delete from public.data_reviews where table_name in ('greenpreneur_pitch_results','centre_greenpreneur','greenpreneur_centres');
alter table public.data_reviews drop constraint if exists data_reviews_table_name_check;
alter table public.data_reviews add constraint data_reviews_table_name_check check (table_name in (
  'advanced_trainers','advanced_cohort_centres',
  'tot_trainees','centre_training_basic','centre_basic_modules','centre_infrastructure',
  'greenpreneur_cohorts'));
-- checklist edits no longer send cohorts back to review: only the cohort's own registration counts matter
create or replace function public.reset_review_on_change()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if tg_table_name = 'advanced_trainers' then
    delete from public.data_reviews where table_name = 'advanced_trainers' and record_key = new.id::text;
  elsif tg_table_name = 'advanced_cohort_centres' then
    delete from public.data_reviews where table_name = 'advanced_cohort_centres' and record_key = new.cohort_id::text || '|' || new.centre_id;
  elsif tg_table_name = 'tot_trainees' then
    delete from public.data_reviews where table_name = 'tot_trainees' and record_key = new.centre_id || '|' || new.position::text;
  elsif tg_table_name = 'centre_training_basic' then
    delete from public.data_reviews where table_name = 'centre_training_basic' and record_key = new.centre_id || '|' || new.year::text;
  elsif tg_table_name = 'centre_basic_modules' then
    delete from public.data_reviews where table_name = 'centre_basic_modules' and record_key = new.centre_id || '|' || new.module;
  elsif tg_table_name = 'centre_infrastructure' then
    delete from public.data_reviews where table_name = 'centre_infrastructure' and record_key = new.centre_id;
  elsif tg_table_name = 'greenpreneur_cohorts' then
    delete from public.data_reviews where table_name = 'greenpreneur_cohorts' and record_key = new.id::text;
  end if;
  return new;
end;
$$;
