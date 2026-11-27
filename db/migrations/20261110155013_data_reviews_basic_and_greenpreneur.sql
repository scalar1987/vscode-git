-- Migration 20261110155013 · data_reviews_basic_and_greenpreneur
-- Exported from the Supabase migration history (applied in production).

alter table public.data_reviews drop constraint if exists data_reviews_table_name_check;
alter table public.data_reviews add constraint data_reviews_table_name_check check (table_name in (
  'advanced_trainers','advanced_cohort_centres',
  'tot_trainees','centre_training_basic','centre_basic_modules','centre_infrastructure',
  'centre_greenpreneur','greenpreneur_centres','greenpreneur_cohorts','greenpreneur_pitch_results'));

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
  elsif tg_table_name in ('centre_infrastructure', 'centre_greenpreneur', 'greenpreneur_centres') then
    delete from public.data_reviews where table_name = tg_table_name and record_key = new.centre_id;
  elsif tg_table_name in ('greenpreneur_cohorts', 'greenpreneur_pitch_results') then
    delete from public.data_reviews where table_name = tg_table_name and record_key = new.id::text;
  elsif tg_table_name = 'greenpreneur_cohort_progress' then
    -- checklist edits send the whole cohort back to review
    delete from public.data_reviews where table_name = 'greenpreneur_cohorts' and record_key = new.cohort_id::text;
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['tot_trainees','centre_training_basic','centre_basic_modules','centre_infrastructure','centre_greenpreneur','greenpreneur_centres','greenpreneur_cohorts','greenpreneur_pitch_results']
  loop
    execute format('drop trigger if exists reset_review_%1$s on public.%1$I', t);
    execute format('create trigger reset_review_%1$s after update on public.%1$I for each row execute function public.reset_review_on_change()', t);
  end loop;
  execute 'drop trigger if exists reset_review_greenpreneur_progress on public.greenpreneur_cohort_progress';
  execute 'create trigger reset_review_greenpreneur_progress after insert or update on public.greenpreneur_cohort_progress for each row execute function public.reset_review_on_change()';
end $$;
