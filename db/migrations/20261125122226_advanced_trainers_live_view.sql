-- Migration 20261125122226 · advanced_trainers_live_view
-- Exported from the Supabase migration history (applied in production).

create or replace view public.advanced_trainers_live as
with base as (
  select t.*,
    (exists (select 1 from public.data_reviews r
              where r.table_name = 'advanced_trainers' and r.record_key = t.id::text
                and r.track = 'ict' and r.status = 'approved')
     or not exists (select 1 from public.review_outbox o
              where o.table_name = 'advanced_trainers' and o.record_key = t.id::text and o.track = 'ict')) as ict_live,
    (exists (select 1 from public.data_reviews r
              where r.table_name = 'advanced_trainers' and r.record_key = t.id::text
                and r.track = 'green' and r.status = 'approved')
     or not exists (select 1 from public.review_outbox o
              where o.table_name = 'advanced_trainers' and o.record_key = t.id::text and o.track = 'green')) as green_live
  from public.advanced_trainers t
)
select
  b.id, b.centre_id, b.name, b.updated_at, b.updated_by,
  (b.in_person_ict and b.ict_live) as in_person_ict,
  b.in_person_ict_date,
  (b.in_person_green and b.green_live) as in_person_green,
  b.in_person_green_date,
  (b.lms_ui_ux and b.ict_live) as lms_ui_ux,
  (b.lms_ios and b.ict_live) as lms_ios,
  (b.lms_android and b.ict_live) as lms_android,
  (b.lms_green_business and b.green_live) as lms_green_business,
  ((b.lms_ui_ux and b.lms_ios and b.lms_android and b.ict_live) and (b.lms_green_business and b.green_live)) as lms_completed,
  b.ict_live, b.green_live
from base b;

grant select on public.advanced_trainers_live to anon, authenticated;
