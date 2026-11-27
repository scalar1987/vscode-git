-- Migration 20261110160601 · tot_trainees_split_in_person
-- Exported from the Supabase migration history (applied in production).

alter table public.tot_trainees
  add column if not exists in_person_ict boolean not null default false,
  add column if not exists in_person_green boolean not null default false,
  add column if not exists in_person_ict_date date,
  add column if not exists in_person_green_date date;
-- existing single in-person flag and date go to both tracks
update public.tot_trainees set
  in_person_ict = coalesce(in_person_completed, false),
  in_person_green = coalesce(in_person_completed, false),
  in_person_ict_date = in_person_date,
  in_person_green_date = in_person_date;
alter table public.tot_trainees drop column in_person_completed;
alter table public.tot_trainees drop column in_person_date;
alter table public.tot_trainees add column in_person_completed boolean generated always as (in_person_ict and in_person_green) stored;

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
