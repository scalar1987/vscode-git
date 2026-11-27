-- Migration 20261110155315 · greenpreneur_pitch_review
-- Exported from the Supabase migration history (applied in production).

alter table public.data_reviews drop constraint if exists data_reviews_table_name_check;
alter table public.data_reviews add constraint data_reviews_table_name_check check (table_name in (
  'advanced_trainers','advanced_cohort_centres',
  'tot_trainees','centre_training_basic','centre_basic_modules','centre_infrastructure',
  'greenpreneur_cohorts','greenpreneur_pitch_results'));
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
  elsif tg_table_name in ('greenpreneur_cohorts', 'greenpreneur_pitch_results') then
    delete from public.data_reviews where table_name = tg_table_name and record_key = new.id::text;
  end if;
  return new;
end;
$$;
drop trigger if exists reset_review_greenpreneur_pitch_results on public.greenpreneur_pitch_results;
create trigger reset_review_greenpreneur_pitch_results after update on public.greenpreneur_pitch_results
  for each row execute function public.reset_review_on_change();
