-- Migration 20261105111645 · fix_module_rights_and_digifemme_sections
-- Exported from the Supabase migration history (applied in production).

-- ICT modules: only Betterworld (advanced_ict) or the centre's own trainers / GGGI
create or replace function public.check_advanced_module_rights()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.can_edit(new.centre_id, 'advanced_ict') or public.can_edit(new.centre_id, 'advanced_green')) then
    raise exception 'not allowed to edit this centre';
  end if;
  if (new.lms_ui_ux is distinct from old.lms_ui_ux or new.lms_ios is distinct from old.lms_ios
      or new.lms_android is distinct from old.lms_android)
     and not public.can_edit(new.centre_id, 'advanced_ict') then
    raise exception 'ICT modules are entered by Betterworld only';
  end if;
  if new.lms_green_business is distinct from old.lms_green_business
     and not public.can_edit(new.centre_id, 'advanced_green') then
    raise exception 'Green Business is entered by Impact Lab only';
  end if;
  return new;
end;
$$;

-- DigiFemme: student figures only (no basic ToT)
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
  elsif req_org = 'Betterworld' then
    assigned_role := 'partner';
    assigned_sections := array['tot','advanced_ict'];
  elsif req_org = 'Impact Lab' then
    assigned_role := 'partner';
    assigned_sections := array['tot','advanced_green'];
  elsif req_org = 'DigiFemme' then
    assigned_role := 'partner';
    assigned_sections := array['advanced'];
  end if;

  insert into public.profiles (user_id, role, centre_id, full_name, section_access)
  values (new.id, assigned_role, assigned_centre, nullif(new.raw_user_meta_data->>'full_name', ''), assigned_sections);
  return new;
end;
$$;
