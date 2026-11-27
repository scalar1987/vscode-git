-- Migration 20261125122200 · review_history_for_approvers
-- Exported from the Supabase migration history (applied in production).

create or replace function public.review_history_in_scope()
returns table (table_name text, record_key text, track text, action text, comment text, actor_email text, acted_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select h.table_name, h.record_key, h.track, h.action, h.comment, h.actor_email, h.acted_at
  from public.review_decisions h
  where exists (
    select 1 from public.approver_scopes s
    where s.email = (auth.jwt() ->> 'email')
      and ('all' = any(s.scope) or public.required_scope(h.table_name, h.track) = any(s.scope))
  )
  order by h.acted_at desc;
$$;

revoke all on function public.review_history_in_scope() from public;
grant execute on function public.review_history_in_scope() to authenticated;
