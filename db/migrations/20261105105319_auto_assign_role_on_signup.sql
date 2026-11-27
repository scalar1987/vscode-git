-- Migration 20261105105319 · auto_assign_role_on_signup
-- Exported from the Supabase migration history (applied in production).

-- Sign-up assigns the role automatically from the centre / organisation the user picks.
-- Real centre        -> coordinator of that centre
-- N/A GGGI           -> GGGI (only when the email is @gggi.org; otherwise pending for approval)
-- N/A SNDI, Dakyung  -> partner, infra
-- N/A Barka Fund     -> partner, greenpreneur
-- N/A Impact Lab, DigiFemme, Betterworld -> partner, tot
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  req_centre text := nullif(new.raw_user_meta_data->>'centre_id', '');
  req_org text := nullif(new.raw_user_meta_data->>'org', '');
  assigned_role text := 'pending';
  assigned_centre text := null;
  assigned_sections text[] := '{}';
begin
  if req_centre is not null then
    assigned_role := 'coordinator';
    assigned_centre := req_centre;
  elsif req_org = 'GGGI' then
    if lower(new.email) like '%@gggi.org' then
      assigned_role := 'ggg';
    end if;
  elsif req_org in ('SNDI', 'Dakyung') then
    assigned_role := 'partner';
    assigned_sections := array['infra'];
  elsif req_org = 'Barka Fund' then
    assigned_role := 'partner';
    assigned_sections := array['greenpreneur'];
  elsif req_org in ('Impact Lab', 'DigiFemme', 'Betterworld') then
    assigned_role := 'partner';
    assigned_sections := array['tot'];
  end if;

  insert into public.profiles (user_id, role, centre_id, full_name, section_access)
  values (new.id, assigned_role, assigned_centre, nullif(new.raw_user_meta_data->>'full_name', ''), assigned_sections);
  return new;
end;
$$;
