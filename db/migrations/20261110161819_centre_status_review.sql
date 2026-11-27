-- Migration 20261110161819 · centre_status_review
-- Exported from the Supabase migration history (applied in production).

alter table public.data_reviews drop constraint if exists data_reviews_table_name_check;
alter table public.data_reviews add constraint data_reviews_table_name_check check (table_name in (
  'advanced_trainers','advanced_cohort_centres',
  'tot_trainees','centre_training_basic','centre_basic_modules',
  'greenpreneur_cohorts','greenpreneur_pitch_results','centres'));

create or replace function public.required_scope(t text, tr text)
returns text language sql immutable as $$
  select case
    when t in ('advanced_trainers', 'tot_trainees') and tr = 'ict' then 'ict_tot'
    when t in ('advanced_trainers', 'tot_trainees') and tr = 'green' then 'green_tot'
    when t in ('advanced_cohort_centres', 'centre_training_basic', 'centre_basic_modules') then 'student'
    when t = 'centres' then 'infra'
    when t in ('greenpreneur_cohorts', 'greenpreneur_pitch_results') then 'greenpreneur'
    else 'all'
  end;
$$;

-- Current centre statuses are already up to date: record them as approved baseline
insert into public.data_reviews (table_name, record_key, track, status, comment, reviewed_at)
select 'centres', id, 'all', 'approved', 'Baseline: status already up to date', now() from public.centres
on conflict (table_name, record_key, track) do nothing;

-- A status change sends that centre back to review
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
  elsif tg_table_name = 'centres' then
    delete from public.data_reviews where table_name = 'centres' and record_key = new.id;
  elsif tg_table_name in ('greenpreneur_cohorts', 'greenpreneur_pitch_results') then
    delete from public.data_reviews where table_name = tg_table_name and record_key = new.id::text;
  end if;
  return new;
end;
$$;

drop trigger if exists reset_review_centres_status on public.centres;
create trigger reset_review_centres_status after update of status on public.centres
  for each row when (old.status is distinct from new.status)
  execute function public.reset_review_on_change();
