-- Migration 20261105111628 · advanced_ict_green_agency_split
-- Exported from the Supabase migration history (applied in production).

-- Betterworld runs the ICT modules, Impact Lab runs Green Business
alter table public.profiles drop constraint if exists profiles_section_access_check;
alter table public.profiles add constraint profiles_section_access_check
  check (section_access <@ array['tot','infra','greenpreneur','advanced','advanced_tot','advanced_ict','advanced_green']::text[]);

create or replace function public.can_edit(c text, s text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and (
        p.role = 'ggg'
        or (p.role = 'partner' and s = any (p.section_access))
        or (p.role = 'coordinator' and p.centre_id = c and s in ('infra','tot','training','advanced','advanced_tot','advanced_ict','advanced_green'))
      )
  );
$$;

-- Trainer rows: either agency may add/remove trainers and edit name / in-person
drop policy if exists "write advanced trainers" on public.advanced_trainers;
create policy "write advanced trainers" on public.advanced_trainers for all
  using (public.can_edit(centre_id, 'advanced_ict') or public.can_edit(centre_id, 'advanced_green'))
  with check (public.can_edit(centre_id, 'advanced_ict') or public.can_edit(centre_id, 'advanced_green'));

-- Module columns: ICT modules need advanced_ict, Green Business needs advanced_green.
-- GGGI and the centre's own trainers may change anything.
create or replace function public.check_advanced_module_rights()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.can_edit(new.centre_id, 'advanced_ict') = false
     and public.can_edit(new.centre_id, 'advanced_green') = false then
    raise exception 'not allowed to edit this centre';
  end if;
  if (new.lms_ui_ux is distinct from old.lms_ui_ux or new.lms_ios is distinct from old.lms_ios
      or new.lms_android is distinct from old.lms_android)
     and not (public.can_edit(new.centre_id, 'advanced_ict') or public.can_edit(new.centre_id, 'infra')) then
    raise exception 'ICT modules are entered by Betterworld only';
  end if;
  if new.lms_green_business is distinct from old.lms_green_business
     and not public.can_edit(new.centre_id, 'advanced_green') then
    raise exception 'Green Business is entered by Impact Lab only';
  end if;
  return new;
end;
$$;
drop trigger if exists advanced_module_rights on public.advanced_trainers;
create trigger advanced_module_rights before update on public.advanced_trainers
  for each row execute function public.check_advanced_module_rights();
revoke execute on function public.check_advanced_module_rights() from public, anon, authenticated;

-- Sign-up mapping
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
    assigned_sections := array['tot','advanced'];
  end if;

  insert into public.profiles (user_id, role, centre_id, full_name, section_access)
  values (new.id, assigned_role, assigned_centre, nullif(new.raw_user_meta_data->>'full_name', ''), assigned_sections);
  return new;
end;
$$;
