-- Migration 20261125121002 · partner_my_submissions
-- Exported from the Supabase migration history (applied in production).

create or replace function public.my_submissions()
returns table (
  id bigint,
  table_name text,
  record_key text,
  track text,
  submitted_at timestamptz,
  change_text text,
  status text,
  comment text,
  reviewed_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select o.id, o.table_name, o.record_key, o.track, o.submitted_at, o.change_text,
         coalesce(r.status, 'pending') as status, r.comment, r.reviewed_at
  from public.review_outbox o
  left join public.data_reviews r
    on r.table_name = o.table_name and r.record_key = o.record_key and r.track = o.track
  where o.submitted_by = (auth.jwt() ->> 'email')
  order by o.submitted_at desc;
$$;

revoke all on function public.my_submissions() from public;
grant execute on function public.my_submissions() to authenticated;
