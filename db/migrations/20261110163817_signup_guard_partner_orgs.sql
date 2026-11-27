-- Migration 20261110163817 · signup_guard_partner_orgs
-- Exported from the Supabase migration history (applied in production).

create or replace function public.guard_signup()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  org text := nullif(new.raw_user_meta_data->>'org', '');
begin
  -- GGGI staff, listed coordinators, and partners who pick their organisation at sign-up
  if lower(new.email) like '%@gggi.org'
     or exists (select 1 from public.signup_allowlist a where a.email = lower(new.email))
     or org in ('SNDI', 'Dakyung', 'Barka Fund', 'Betterworld', 'Impact Lab', 'DigiFemme') then
    return new;
  end if;
  raise exception 'Sign-up is closed for this email. Ask GGGI to approve it.';
end;
$$;
