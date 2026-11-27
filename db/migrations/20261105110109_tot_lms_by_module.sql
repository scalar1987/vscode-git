-- Migration 20261105110109 · tot_lms_by_module
-- Exported from the Supabase migration history (applied in production).

-- Online LMS is tracked per module; the LMS total is complete only when all four modules are complete
alter table public.tot_trainees add column if not exists lms_word boolean not null default false;
alter table public.tot_trainees add column if not exists lms_excel boolean not null default false;
alter table public.tot_trainees add column if not exists lms_ppt boolean not null default false;
alter table public.tot_trainees add column if not exists lms_green boolean not null default false;

-- Keep the existing LMS flag: anyone recorded as LMS-complete gets all four modules
update public.tot_trainees
set lms_word = true, lms_excel = true, lms_ppt = true, lms_green = true
where lms_completed = true;

alter table public.tot_trainees drop column lms_completed;
alter table public.tot_trainees add column lms_completed boolean
  generated always as (lms_word and lms_excel and lms_ppt and lms_green) stored;
