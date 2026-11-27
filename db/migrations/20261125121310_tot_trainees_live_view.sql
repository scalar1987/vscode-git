-- Migration 20261125121310 · tot_trainees_live_view
-- Exported from the Supabase migration history (applied in production).

create or replace view public.tot_trainees_live as
with base as (
  select t.*,
    -- ICT unit is live when GGGI approved it, or when no partner has submitted it (GGGI or imported entries)
    (exists (select 1 from public.data_reviews r
              where r.table_name = 'tot_trainees' and r.record_key = t.centre_id || '|' || t.position::text
                and r.track = 'ict' and r.status = 'approved')
     or not exists (select 1 from public.review_outbox o
              where o.table_name = 'tot_trainees' and o.record_key = t.centre_id || '|' || t.position::text
                and o.track = 'ict')) as ict_live,
    (exists (select 1 from public.data_reviews r
              where r.table_name = 'tot_trainees' and r.record_key = t.centre_id || '|' || t.position::text
                and r.track = 'green' and r.status = 'approved')
     or not exists (select 1 from public.review_outbox o
              where o.table_name = 'tot_trainees' and o.record_key = t.centre_id || '|' || t.position::text
                and o.track = 'green')) as green_live
  from public.tot_trainees t
)
select
  b.centre_id, b.position, b.name,
  (b.in_person_ict and b.ict_live) as in_person_ict,
  (b.in_person_green and b.green_live) as in_person_green,
  (b.lms_word and b.ict_live) as lms_word,
  (b.lms_excel and b.ict_live) as lms_excel,
  (b.lms_ppt and b.ict_live) as lms_ppt,
  (b.lms_green and b.green_live) as lms_green,
  ((b.in_person_ict and b.ict_live) and (b.in_person_green and b.green_live)) as in_person_completed,
  ((b.lms_word and b.lms_excel and b.lms_ppt and b.ict_live) and (b.lms_green and b.green_live)) as lms_completed,
  b.ict_live, b.green_live
from base b;

grant select on public.tot_trainees_live to anon, authenticated;
