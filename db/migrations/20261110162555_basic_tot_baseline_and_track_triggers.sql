-- Migration 20261110162555 · basic_tot_baseline_and_track_triggers
-- Exported from the Supabase migration history (applied in production).

-- Current basic ToT entries are up to date: record every row as approved (ICT and Green) as the baseline
insert into public.data_reviews (table_name, record_key, track, status, comment, reviewed_at)
select 'tot_trainees', centre_id || '|' || position::text, t.track, 'approved', 'Baseline: already up to date', now()
from public.tot_trainees, (values ('ict'), ('green')) as t(track)
on conflict (table_name, record_key, track) do nothing;

-- Replace the whole-row trigger with one per track: an ICT change only sends the ICT part back to review
drop trigger if exists reset_review_tot_trainees on public.tot_trainees;

create or replace function public.reset_tot_track()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  delete from public.data_reviews
  where table_name = 'tot_trainees' and record_key = new.centre_id || '|' || new.position::text and track = tg_argv[0];
  return new;
end;
$$;

drop trigger if exists reset_review_tot_ict on public.tot_trainees;
create trigger reset_review_tot_ict after update on public.tot_trainees
  for each row when ((old.name, old.in_person_ict, old.in_person_ict_date, old.lms_word, old.lms_excel, old.lms_ppt)
    is distinct from (new.name, new.in_person_ict, new.in_person_ict_date, new.lms_word, new.lms_excel, new.lms_ppt))
  execute function public.reset_tot_track('ict');

drop trigger if exists reset_review_tot_green on public.tot_trainees;
create trigger reset_review_tot_green after update on public.tot_trainees
  for each row when ((old.name, old.in_person_green, old.in_person_green_date, old.lms_green)
    is distinct from (new.name, new.in_person_green, new.in_person_green_date, new.lms_green))
  execute function public.reset_tot_track('green');
