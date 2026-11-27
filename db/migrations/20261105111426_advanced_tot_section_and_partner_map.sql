-- Migration 20261105111426 · advanced_tot_section_and_partner_map
-- Exported from the Supabase migration history (applied in production).

-- Advanced trainer ToT is its own section (implementing agencies: Betterworld, Impact Lab)
alter table public.profiles drop constraint if exists profiles_section_access_check;
alter table public.profiles add constraint profiles_section_access_check
  check (section_access <@ array['tot','infra','greenpreneur','advanced','advanced_tot']::text[]);

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
        or (p.role = 'coordinator' and p.centre_id = c and s in ('infra','tot','training','advanced','advanced_tot'))
      )
  );
$$;

-- Advanced trainer ToT rows follow the advanced_tot section
drop policy if exists "write advanced trainers" on public.advanced_trainers;
create policy "write advanced trainers" on public.advanced_trainers for all
  using (public.can_edit(centre_id, 'advanced_tot')) with check (public.can_edit(centre_id, 'advanced_tot'));

-- Sign-up mapping for organisations (automatic when the email / choice is set)
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
  elsif req_org in ('Impact Lab', 'Betterworld') then
    assigned_role := 'partner';
    assigned_sections := array['tot','advanced_tot'];
  elsif req_org = 'DigiFemme' then
    assigned_role := 'partner';
    assigned_sections := array['tot','advanced'];
  end if;

  insert into public.profiles (user_id, role, centre_id, full_name, section_access)
  values (new.id, assigned_role, assigned_centre, nullif(new.raw_user_meta_data->>'full_name', ''), assigned_sections);
  return new;
end;
$$;
