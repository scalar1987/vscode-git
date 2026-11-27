-- Migration 20261111070147 · queue_only_partner_submissions
-- Exported from the Supabase migration history (applied in production).

create or replace function public.queue_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

delete from public.review_outbox where id = 4 and sent_at is null and submitted_by is null;
