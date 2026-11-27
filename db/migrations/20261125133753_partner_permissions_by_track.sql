-- Migration 20261125133753 · partner_permissions_by_track
-- Exported from the Supabase migration history (applied in production).

-- Basic ToT is split into ICT and Green sections (as the Advanced programme already is).
alter table public.profiles drop constraint profiles_section_access_check;
alter table public.profiles add constraint profiles_section_access_check
  check (section_access <@ array['tot','tot_ict','tot_green','infra','greenpreneur','advanced','advanced_tot','advanced_ict','advanced_green']::text[]);

-- Partner permissions, as set by GGGI:
--   Barka Fund (Saphyra)    : Greenpreneur data input
--   Betterworld (Erica)     : Basic ToT ICT, Advanced ICT
--   DigiFemme (Betsalel, Kevin, test account) : Advanced (all tracks)
--   Impact Lab (Ochou)      : Basic ToT Green, Advanced Green
update public.profiles p set section_access = array['greenpreneur']
  from auth.users u where u.id = p.user_id and u.email = 'user5@example.org';
update public.profiles p set section_access = array['tot_ict', 'advanced_ict']
  from auth.users u where u.id = p.user_id and u.email = 'user6@example.org';
update public.profiles p set section_access = array['advanced', 'advanced_ict', 'advanced_green']
  from auth.users u where u.id = p.user_id and u.email in ('user7@example.org', 'user8@example.org', 'user9@example.org');
update public.profiles p set section_access = array['tot_green', 'advanced_green']
  from auth.users u where u.id = p.user_id and u.email = 'user10@example.org';

-- can_edit: coordinators keep their access, now also for the split ToT sections
create or replace function public.can_edit(c text, s text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and (
        p.role = 'ggg'
        or (p.role = 'partner' and s = any (p.section_access))
        or (p.role = 'coordinator' and p.centre_id = c and s in ('infra','tot','tot_ict','tot_green','training','advanced','advanced_tot','advanced_ict','advanced_green'))
      )
  );
$$;

-- Basic ToT rows: writable by a partner with either ToT track; the guard below limits each track
drop policy if exists "write tot" on public.tot_trainees;
create policy "write tot" on public.tot_trainees for all
  using (public.can_edit(centre_id, 'tot_ict') or public.can_edit(centre_id, 'tot_green'))
  with check (public.can_edit(centre_id, 'tot_ict') or public.can_edit(centre_id, 'tot_green'));

create or replace function public.tot_track_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ok_ict boolean := public.can_edit(new.centre_id, 'tot_ict');
  ok_green boolean := public.can_edit(new.centre_id, 'tot_green');
begin
  if tg_op = 'INSERT' then
    if (coalesce(new.in_person_ict,false) or coalesce(new.lms_word,false) or coalesce(new.lms_excel,false) or coalesce(new.lms_ppt,false)) and not ok_ict then
      raise exception 'Your organisation cannot enter ICT ToT data';
    end if;
    if (coalesce(new.in_person_green,false) or coalesce(new.lms_green,false)) and not ok_green then
      raise exception 'Your organisation cannot enter Green ToT data';
    end if;
  else
    if (new.in_person_ict, new.in_person_ict_date, new.lms_word, new.lms_excel, new.lms_ppt)
       is distinct from (old.in_person_ict, old.in_person_ict_date, old.lms_word, old.lms_excel, old.lms_ppt) and not ok_ict then
      raise exception 'Your organisation cannot change ICT ToT data';
    end if;
    if (new.in_person_green, new.in_person_green_date, new.lms_green)
       is distinct from (old.in_person_green, old.in_person_green_date, old.lms_green) and not ok_green then
      raise exception 'Your organisation cannot change Green ToT data';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists tot_track_guard on public.tot_trainees;
create trigger tot_track_guard before insert or update on public.tot_trainees
  for each row execute function public.tot_track_guard();

-- Advanced trainers: same per-track guard
create or replace function public.adv_trainer_track_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ok_ict boolean := public.can_edit(new.centre_id, 'advanced_ict');
  ok_green boolean := public.can_edit(new.centre_id, 'advanced_green');
begin
  if tg_op = 'INSERT' then
    if (coalesce(new.in_person_ict,false) or coalesce(new.lms_ui_ux,false) or coalesce(new.lms_ios,false) or coalesce(new.lms_android,false)) and not ok_ict then
      raise exception 'Your organisation cannot enter advanced ICT data';
    end if;
    if (coalesce(new.in_person_green,false) or coalesce(new.lms_green_business,false)) and not ok_green then
      raise exception 'Your organisation cannot enter advanced Green data';
    end if;
  else
    if (new.in_person_ict, new.lms_ui_ux, new.lms_ios, new.lms_android)
       is distinct from (old.in_person_ict, old.lms_ui_ux, old.lms_ios, old.lms_android) and not ok_ict then
      raise exception 'Your organisation cannot change advanced ICT data';
    end if;
    if (new.in_person_green, new.lms_green_business)
       is distinct from (old.in_person_green, old.lms_green_business) and not ok_green then
      raise exception 'Your organisation cannot change advanced Green data';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists adv_trainer_track_guard on public.advanced_trainers;
create trigger adv_trainer_track_guard before insert or update on public.advanced_trainers
  for each row execute function public.adv_trainer_track_guard();
