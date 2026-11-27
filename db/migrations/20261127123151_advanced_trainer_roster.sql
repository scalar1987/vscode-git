-- Migration 20261127123151 · advanced_trainer_roster
-- Exported from the Supabase migration history (applied in production).

-- 1. Trainer <-> centre assignments (a trainer can work at several centres)
create table public.advanced_trainer_centres (
  trainer_id uuid not null references public.advanced_trainers(id) on delete cascade,
  centre_id text not null references public.centres(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (trainer_id, centre_id)
);
alter table public.advanced_trainer_centres enable row level security;
create policy "read trainer centres" on public.advanced_trainer_centres for select using (true);
-- Assignments are managed by DigiFemme (both advanced tracks) and GGGI
create policy "write trainer centres" on public.advanced_trainer_centres for all
  using (public.can_edit(centre_id, 'advanced_ict') and public.can_edit(centre_id, 'advanced_green'))
  with check (public.can_edit(centre_id, 'advanced_ict') and public.can_edit(centre_id, 'advanced_green'));

insert into public.advanced_trainer_centres (trainer_id, centre_id)
select id, centre_id from public.advanced_trainers where centre_id is not null;

-- 2. Inactive trainers are hidden and not counted, but their records are kept
alter table public.advanced_trainers add column active boolean not null default true;

-- 3. The centre now comes from the assignment table; new trainers may have none yet
alter table public.advanced_trainers alter column centre_id drop not null;

-- 4. One trainer was listed twice (Bondoukou and Korhogo): keep the Bondoukou record, add Korhogo, remove the duplicate
--    (trainer name removed from this public copy; the ids identify the records)
insert into public.advanced_trainer_centres (trainer_id, centre_id)
values ('65ddee6e-5992-44f9-a3c9-e63c88bbe07e', 'univ_korhogo')
on conflict do nothing;
alter table public.advanced_trainers disable trigger advanced_trainer_delete_rights;
alter table public.advanced_trainers disable trigger log_change_advanced_trainers;
delete from public.advanced_trainers where id = '93be24b3-5334-4b1c-9cf6-345c32f81d92';
alter table public.advanced_trainers enable trigger advanced_trainer_delete_rights;
alter table public.advanced_trainers enable trigger log_change_advanced_trainers;

-- 5. Renaming or (de)activating a trainer is not ToT data: do not reset its ToT reviews
drop trigger reset_adv_trainer_ict on public.advanced_trainers;
drop trigger reset_adv_trainer_green on public.advanced_trainers;
create trigger reset_adv_trainer_ict after update on public.advanced_trainers for each row
  when ((old.in_person_ict, old.in_person_ict_date, old.lms_ui_ux, old.lms_ios, old.lms_android)
        is distinct from (new.in_person_ict, new.in_person_ict_date, new.lms_ui_ux, new.lms_ios, new.lms_android))
  execute function public.reset_adv_trainer_track('ict');
create trigger reset_adv_trainer_green after update on public.advanced_trainers for each row
  when ((old.in_person_green, old.in_person_green_date, old.lms_green_business)
        is distinct from (new.in_person_green, new.in_person_green_date, new.lms_green_business))
  execute function public.reset_adv_trainer_track('green');

-- 6. Queue an advanced trainer track for approval only when that track's ToT data actually changed
create or replace function public.queue_submission()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  who text := auth.jwt() ->> 'email';
  nj jsonb := to_jsonb(new);
  oj jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  chg text := public.change_summary(oj, nj);
  k text;
  has_ict boolean;
  has_green boolean;
begin
  -- Only partner submissions notify approvers. Edits made by GGGI approvers (or without a signed-in user) are not queued.
  if who is null or exists (select 1 from public.approver_scopes where email = who) then
    return new;
  end if;

  if tg_table_name = 'advanced_trainers' then
    k := new.id::text;
    has_ict := coalesce(new.in_person_ict or new.lms_ui_ux or new.lms_ios or new.lms_android, false);
    has_green := coalesce(new.in_person_green or new.lms_green_business, false);
    if tg_op = 'UPDATE' then
      has_ict := has_ict and (old.in_person_ict, old.in_person_ict_date, old.lms_ui_ux, old.lms_ios, old.lms_android)
        is distinct from (new.in_person_ict, new.in_person_ict_date, new.lms_ui_ux, new.lms_ios, new.lms_android);
      has_green := has_green and (old.in_person_green, old.in_person_green_date, old.lms_green_business)
        is distinct from (new.in_person_green, new.in_person_green_date, new.lms_green_business);
    end if;
    if has_ict then insert into public.review_outbox (table_name, record_key, track, submitted_by, change_text) values ('advanced_trainers', k, 'ict', who, chg); end if;
    if has_green then insert into public.review_outbox (table_name, record_key, track, submitted_by, change_text) values ('advanced_trainers', k, 'green', who, chg); end if;
  elsif tg_table_name = 'tot_trainees' then
    k := new.centre_id || '|' || new.position::text;
    has_ict := coalesce(new.in_person_ict or new.lms_word or new.lms_excel or new.lms_ppt, false);
    has_green := coalesce(new.in_person_green or new.lms_green, false);
    if has_ict then insert into public.review_outbox (table_name, record_key, track, submitted_by, change_text) values ('tot_trainees', k, 'ict', who, chg); end if;
    if has_green then insert into public.review_outbox (table_name, record_key, track, submitted_by, change_text) values ('tot_trainees', k, 'green', who, chg); end if;
  elsif tg_table_name = 'advanced_cohort_centres' then
    if coalesce(new.enrolled, 0) > 0 or coalesce(new.graduated, 0) > 0 then
      insert into public.review_outbox (table_name, record_key, track, submitted_by, change_text) values ('advanced_cohort_centres', new.cohort_id::text || '|' || new.centre_id, 'all', who, chg);
    end if;
  elsif tg_table_name = 'centre_training_basic' then
    insert into public.review_outbox (table_name, record_key, track, submitted_by, change_text) values ('centre_training_basic', new.centre_id || '|' || new.year::text, 'all', who, chg);
  elsif tg_table_name = 'centre_basic_modules' then
    insert into public.review_outbox (table_name, record_key, track, submitted_by, change_text) values ('centre_basic_modules', new.centre_id || '|' || new.module, 'all', who, chg);
  elsif tg_table_name = 'centres' then
    insert into public.review_outbox (table_name, record_key, track, submitted_by, change_text) values ('centres', new.id, 'all', who, chg);
  elsif tg_table_name = 'greenpreneur_cohorts' then
    if coalesce(new.enrolled, 0) > 0 then
      insert into public.review_outbox (table_name, record_key, track, submitted_by, change_text) values ('greenpreneur_cohorts', new.id::text, 'all', who, chg);
    end if;
  elsif tg_table_name = 'greenpreneur_pitch_results' then
    insert into public.review_outbox (table_name, record_key, track, submitted_by, change_text) values ('greenpreneur_pitch_results', new.id::text, 'all', who, chg);
  end if;
  return new;
end;
$function$;

-- 7. Live (counted) values: approved, or never submitted and never reviewed.
--    Rejected and changes-requested values no longer count. Inactive trainers are left out.
drop view public.advanced_trainers_live;
create view public.advanced_trainers_live with (security_invoker = on) as
with base as (
  select t.*,
    (exists (select 1 from data_reviews r where r.table_name = 'advanced_trainers' and r.record_key = t.id::text and r.track = 'ict' and r.status = 'approved'))
      or (not exists (select 1 from review_outbox o where o.table_name = 'advanced_trainers' and o.record_key = t.id::text and o.track = 'ict')
          and not exists (select 1 from data_reviews r where r.table_name = 'advanced_trainers' and r.record_key = t.id::text and r.track = 'ict')) as ict_live,
    (exists (select 1 from data_reviews r where r.table_name = 'advanced_trainers' and r.record_key = t.id::text and r.track = 'green' and r.status = 'approved'))
      or (not exists (select 1 from review_outbox o where o.table_name = 'advanced_trainers' and o.record_key = t.id::text and o.track = 'green')
          and not exists (select 1 from data_reviews r where r.table_name = 'advanced_trainers' and r.record_key = t.id::text and r.track = 'green')) as green_live
  from advanced_trainers t
  where t.active
)
select id, centre_id, name, updated_at, updated_by,
  in_person_ict and ict_live as in_person_ict, in_person_ict_date,
  in_person_green and green_live as in_person_green, in_person_green_date,
  lms_ui_ux and ict_live as lms_ui_ux,
  lms_ios and ict_live as lms_ios,
  lms_android and ict_live as lms_android,
  lms_green_business and green_live as lms_green_business,
  lms_ui_ux and lms_ios and lms_android and ict_live and lms_green_business and green_live as lms_completed,
  ict_live, green_live
from base;
grant select on public.advanced_trainers_live to anon, authenticated;
