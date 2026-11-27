-- Migration 20261110161058 · fix_approver_scopes_recursion
-- Exported from the Supabase migration history (applied in production).

create or replace function public.is_full_approver()
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.approver_scopes s where s.email = (auth.jwt() ->> 'email') and 'all' = any(s.scope));
$$;

drop policy if exists "full approvers manage scopes" on public.approver_scopes;
create policy "full approvers manage scopes" on public.approver_scopes for all
  using (public.is_full_approver())
  with check (public.is_full_approver());
