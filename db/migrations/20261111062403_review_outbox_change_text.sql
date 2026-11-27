-- Migration 20261111062403 · review_outbox_change_text
-- Exported from the Supabase migration history (applied in production).

alter table public.review_outbox add column if not exists change_text text;

create or replace function public.change_summary(oj jsonb, nj jsonb)
returns text language sql immutable as $$
  select string_agg(format('%s: %s → %s', k, coalesce(oj->>k, '–'), coalesce(nj->>k, '–')), '; ')
  from jsonb_object_keys(nj) as k
  where (oj->>k) is distinct from (nj->>k)
    and k not in ('updated_at', 'updated_by', 'created_at');
$$;

create or replace function public.queue_submission()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  who text := auth.jwt() ->> 'email';
  nj jsonb := to_jsonb(new);
  oj jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  chg text := public.change_summary(oj, nj);
  k text;
  has_ict boolean;
  has_green boolean;
begin
  if tg_table_name = 'advanced_trainers' then
    k := new.id::text;
    has_ict := coalesce(new.in_person_ict or new.lms_ui_ux or new.lms_ios or new.lms_android, false);
    has_green := coalesce(new.in_person_green or new.lms_green_business, false);
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
$$;

-- The weekly summary shows the latest change each approved unit had before it was approved
create or replace view public.approval_log_v as
select d.table_name, d.record_key, d.track, d.status, d.comment, d.reviewed_at, u.email as reviewer,
  case
    when d.table_name = 'advanced_trainers' then (select t.name from public.advanced_trainers t where t.id::text = d.record_key)
    when d.table_name = 'tot_trainees' then (select t.name from public.tot_trainees t where t.centre_id || '|' || t.position::text = d.record_key)
    when d.table_name = 'greenpreneur_cohorts' then (select g.name from public.greenpreneur_cohorts g where g.id::text = d.record_key)
    when d.table_name = 'centres' then (select c.name from public.centres c where c.id = d.record_key)
    else d.table_name || ' ' || d.record_key
  end as label,
  (select o.change_text from public.review_outbox o
    where o.table_name = d.table_name and o.record_key = d.record_key and o.track = d.track and o.submitted_at <= d.reviewed_at
    order by o.submitted_at desc limit 1) as change_text
from public.data_reviews d
left join auth.users u on u.id = d.reviewed_by;
revoke all on public.approval_log_v from anon, authenticated;
grant select on public.approval_log_v to service_role;
