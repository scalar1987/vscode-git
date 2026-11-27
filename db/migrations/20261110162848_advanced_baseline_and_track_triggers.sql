-- Migration 20261110162848 · advanced_baseline_and_track_triggers
-- Exported from the Supabase migration history (applied in production).

-- Current Advanced placements and cohort counts are up to date: record them as the approved baseline
insert into public.data_reviews (table_name, record_key, track, status, comment, reviewed_at)
select 'advanced_trainers', id::text, t.track, 'approved', 'Baseline: already up to date', now()
from public.advanced_trainers, (values ('ict'), ('green')) as t(track)
on conflict (table_name, record_key, track) do nothing;

insert into public.data_reviews (table_name, record_key, track, status, comment, reviewed_at)
select 'advanced_cohort_centres', cohort_id::text || '|' || centre_id, 'all', 'approved', 'Baseline: already up to date', now()
from public.advanced_cohort_centres
on conflict (table_name, record_key, track) do nothing;

-- Per-track triggers for Advanced trainers, and a change-only trigger for cohort counts
drop trigger if exists reset_review_trainers on public.advanced_trainers;
drop trigger if exists reset_review_cohort_centres on public.advanced_cohort_centres;

create or replace function public.reset_adv_trainer_track()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  delete from public.data_reviews where table_name = 'advanced_trainers' and record_key = new.id::text and track = tg_argv[0];
  return new;
end;
$$;

drop trigger if exists reset_adv_trainer_ict on public.advanced_trainers;
create trigger reset_adv_trainer_ict after update on public.advanced_trainers
  for each row when ((old.name, old.centre_id, old.in_person_ict, old.in_person_ict_date, old.lms_ui_ux, old.lms_ios, old.lms_android)
    is distinct from (new.name, new.centre_id, new.in_person_ict, new.in_person_ict_date, new.lms_ui_ux, new.lms_ios, new.lms_android))
  execute function public.reset_adv_trainer_track('ict');

drop trigger if exists reset_adv_trainer_green on public.advanced_trainers;
create trigger reset_adv_trainer_green after update on public.advanced_trainers
  for each row when ((old.name, old.centre_id, old.in_person_green, old.in_person_green_date, old.lms_green_business)
    is distinct from (new.name, new.centre_id, new.in_person_green, new.in_person_green_date, new.lms_green_business))
  execute function public.reset_adv_trainer_track('green');

create or replace function public.reset_cohort_centre_review()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  delete from public.data_reviews where table_name = 'advanced_cohort_centres' and record_key = new.cohort_id::text || '|' || new.centre_id;
  return new;
end;
$$;

drop trigger if exists reset_cohort_centre_counts on public.advanced_cohort_centres;
create trigger reset_cohort_centre_counts after update on public.advanced_cohort_centres
  for each row when ((old.enrolled, old.graduated) is distinct from (new.enrolled, new.graduated))
  execute function public.reset_cohort_centre_review();
