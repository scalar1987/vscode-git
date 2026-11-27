-- Migration 20261127123212 · live_views_exclude_rejected
-- Exported from the Supabase migration history (applied in production).

-- The live views read review_outbox, which clients cannot read: run them with owner rights (as before)
alter view public.advanced_trainers_live reset (security_invoker);

-- Basic ToT: same rule. Rejected and changes-requested values no longer count as live.
create or replace view public.tot_trainees_live as
with base as (
  select t.centre_id, t."position", t.name, t.updated_at, t.updated_by,
    t.lms_word, t.lms_excel, t.lms_ppt, t.lms_green, t.lms_completed,
    t.in_person_ict, t.in_person_green, t.in_person_ict_date, t.in_person_green_date, t.in_person_completed,
    (exists (select 1 from data_reviews r where r.table_name = 'tot_trainees' and r.record_key = t.centre_id || '|' || t."position"::text and r.track = 'ict' and r.status = 'approved'))
      or (not exists (select 1 from review_outbox o where o.table_name = 'tot_trainees' and o.record_key = t.centre_id || '|' || t."position"::text and o.track = 'ict')
          and not exists (select 1 from data_reviews r where r.table_name = 'tot_trainees' and r.record_key = t.centre_id || '|' || t."position"::text and r.track = 'ict')) as ict_live,
    (exists (select 1 from data_reviews r where r.table_name = 'tot_trainees' and r.record_key = t.centre_id || '|' || t."position"::text and r.track = 'green' and r.status = 'approved'))
      or (not exists (select 1 from review_outbox o where o.table_name = 'tot_trainees' and o.record_key = t.centre_id || '|' || t."position"::text and o.track = 'green')
          and not exists (select 1 from data_reviews r where r.table_name = 'tot_trainees' and r.record_key = t.centre_id || '|' || t."position"::text and r.track = 'green')) as green_live
  from tot_trainees t
)
select centre_id, "position", name,
  in_person_ict and ict_live as in_person_ict,
  in_person_green and green_live as in_person_green,
  lms_word and ict_live as lms_word,
  lms_excel and ict_live as lms_excel,
  lms_ppt and ict_live as lms_ppt,
  lms_green and green_live as lms_green,
  in_person_ict and ict_live and (in_person_green and green_live) as in_person_completed,
  lms_word and lms_excel and lms_ppt and ict_live and (lms_green and green_live) as lms_completed,
  ict_live, green_live
from base b;
