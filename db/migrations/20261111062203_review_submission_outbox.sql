-- Migration 20261111062203 · review_submission_outbox
-- Exported from the Supabase migration history (applied in production).

create table if not exists public.review_outbox (
  id bigserial primary key,
  table_name text not null,
  record_key text not null,
  track text not null,
  submitted_by text,
  submitted_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table public.review_outbox enable row level security;
-- no client access: only the database and the edge function (service role) read it
create policy "no client access to outbox" on public.review_outbox for select using (false);

-- Records a submission for each unit that has data after a partner's change
create or replace function public.queue_submission()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  who text := auth.jwt() ->> 'email';
  k text;
  has_ict boolean;
  has_green boolean;
begin
  if tg_table_name = 'advanced_trainers' then
    k := new.id::text;
    has_ict := coalesce(new.in_person_ict or new.lms_ui_ux or new.lms_ios or new.lms_android, false);
    has_green := coalesce(new.in_person_green or new.lms_green_business, false);
    if has_ict then insert into public.review_outbox (table_name, record_key, track, submitted_by) values ('advanced_trainers', k, 'ict', who); end if;
    if has_green then insert into public.review_outbox (table_name, record_key, track, submitted_by) values ('advanced_trainers', k, 'green', who); end if;
  elsif tg_table_name = 'tot_trainees' then
    k := new.centre_id || '|' || new.position::text;
    has_ict := coalesce(new.in_person_ict or new.lms_word or new.lms_excel or new.lms_ppt, false);
    has_green := coalesce(new.in_person_green or new.lms_green, false);
    if has_ict then insert into public.review_outbox (table_name, record_key, track, submitted_by) values ('tot_trainees', k, 'ict', who); end if;
    if has_green then insert into public.review_outbox (table_name, record_key, track, submitted_by) values ('tot_trainees', k, 'green', who); end if;
  elsif tg_table_name = 'advanced_cohort_centres' then
    if coalesce(new.enrolled, 0) > 0 or coalesce(new.graduated, 0) > 0 then
      insert into public.review_outbox (table_name, record_key, track, submitted_by) values ('advanced_cohort_centres', new.cohort_id::text || '|' || new.centre_id, 'all', who);
    end if;
  elsif tg_table_name = 'centre_training_basic' then
    insert into public.review_outbox (table_name, record_key, track, submitted_by) values ('centre_training_basic', new.centre_id || '|' || new.year::text, 'all', who);
  elsif tg_table_name = 'centre_basic_modules' then
    insert into public.review_outbox (table_name, record_key, track, submitted_by) values ('centre_basic_modules', new.centre_id || '|' || new.module, 'all', who);
  elsif tg_table_name = 'centres' then
    insert into public.review_outbox (table_name, record_key, track, submitted_by) values ('centres', new.id, 'all', who);
  elsif tg_table_name = 'greenpreneur_cohorts' then
    if coalesce(new.enrolled, 0) > 0 then
      insert into public.review_outbox (table_name, record_key, track, submitted_by) values ('greenpreneur_cohorts', new.id::text, 'all', who);
    end if;
  elsif tg_table_name = 'greenpreneur_pitch_results' then
    insert into public.review_outbox (table_name, record_key, track, submitted_by) values ('greenpreneur_pitch_results', new.id::text, 'all', who);
  end if;
  return new;
end;
$$;

drop trigger if exists queue_submission_adv_trainers on public.advanced_trainers;
create trigger queue_submission_adv_trainers after insert or update on public.advanced_trainers
  for each row execute function public.queue_submission();
drop trigger if exists queue_submission_tot on public.tot_trainees;
create trigger queue_submission_tot after insert or update on public.tot_trainees
  for each row execute function public.queue_submission();
drop trigger if exists queue_submission_adv_cohort_centres on public.advanced_cohort_centres;
create trigger queue_submission_adv_cohort_centres after insert or update on public.advanced_cohort_centres
  for each row execute function public.queue_submission();
drop trigger if exists queue_submission_training_basic on public.centre_training_basic;
create trigger queue_submission_training_basic after insert or update on public.centre_training_basic
  for each row execute function public.queue_submission();
drop trigger if exists queue_submission_basic_modules on public.centre_basic_modules;
create trigger queue_submission_basic_modules after insert or update on public.centre_basic_modules
  for each row execute function public.queue_submission();
drop trigger if exists queue_submission_centres on public.centres;
create trigger queue_submission_centres after update of status on public.centres
  for each row when (old.status is distinct from new.status) execute function public.queue_submission();
drop trigger if exists queue_submission_gp_cohorts on public.greenpreneur_cohorts;
create trigger queue_submission_gp_cohorts after insert or update on public.greenpreneur_cohorts
  for each row execute function public.queue_submission();
drop trigger if exists queue_submission_gp_pitch on public.greenpreneur_pitch_results;
create trigger queue_submission_gp_pitch after insert on public.greenpreneur_pitch_results
  for each row execute function public.queue_submission();

-- Readable summary for the weekly email: approved units with labels and the approver's email
create or replace view public.approval_log_v as
select d.table_name, d.record_key, d.track, d.status, d.comment, d.reviewed_at, u.email as reviewer,
  case
    when d.table_name = 'advanced_trainers' then (select t.name from public.advanced_trainers t where t.id::text = d.record_key)
    when d.table_name = 'tot_trainees' then (select t.name from public.tot_trainees t where t.centre_id || '|' || t.position::text = d.record_key)
    when d.table_name = 'greenpreneur_cohorts' then (select g.name from public.greenpreneur_cohorts g where g.id::text = d.record_key)
    when d.table_name = 'centres' then (select c.name from public.centres c where c.id = d.record_key)
    else d.table_name || ' ' || d.record_key
  end as label
from public.data_reviews d
left join auth.users u on u.id = d.reviewed_by;
