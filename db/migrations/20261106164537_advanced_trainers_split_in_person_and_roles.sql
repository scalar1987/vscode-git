-- Migration 20261106164537 · advanced_trainers_split_in_person_and_roles
-- Exported from the Supabase migration history (applied in production).

alter table public.advanced_trainers
  add column if not exists in_person_ict boolean not null default false,
  add column if not exists in_person_ict_date date,
  add column if not exists in_person_green boolean not null default false,
  add column if not exists in_person_green_date date;
alter table public.advanced_trainers drop column if exists in_person_completed;
alter table public.advanced_trainers drop column if exists in_person_date;

create or replace function public.check_advanced_module_rights()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  ict boolean := public.can_edit(new.centre_id, 'advanced_ict');
  green boolean := public.can_edit(new.centre_id, 'advanced_green');
begin
  if not (ict or green) then
    raise exception 'not allowed to edit this centre';
  end if;
  if tg_op = 'INSERT' then
    if not (ict and green) then
      raise exception 'Trainers are added by DigiFemme only';
    end if;
    return new;
  end if;
  if new.name is distinct from old.name or new.centre_id is distinct from old.centre_id then
    if not (ict and green) then
      raise exception 'Trainer names are entered by DigiFemme only';
    end if;
  end if;
  if (new.lms_ui_ux, new.lms_ios, new.lms_android) is distinct from (old.lms_ui_ux, old.lms_ios, old.lms_android) and not ict then
    raise exception 'ICT modules are entered by Betterworld only';
  end if;
  if (new.in_person_ict, new.in_person_ict_date) is distinct from (old.in_person_ict, old.in_person_ict_date) and not ict then
    raise exception 'ICT in-person training is entered by Betterworld only';
  end if;
  if new.lms_green_business is distinct from old.lms_green_business and not green then
    raise exception 'Green Business is entered by Impact Lab only';
  end if;
  if (new.in_person_green, new.in_person_green_date) is distinct from (old.in_person_green, old.in_person_green_date) and not green then
    raise exception 'Green in-person training is entered by Impact Lab only';
  end if;
  return new;
end;
$$;

drop trigger if exists advanced_module_rights on public.advanced_trainers;
create trigger advanced_module_rights before insert or update on public.advanced_trainers
  for each row execute function public.check_advanced_module_rights();

create or replace function public.check_advanced_trainer_delete()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not (public.can_edit(old.centre_id, 'advanced_ict') and public.can_edit(old.centre_id, 'advanced_green')) then
    raise exception 'Trainers are removed by DigiFemme only';
  end if;
  return old;
end;
$$;

drop trigger if exists advanced_trainer_delete_rights on public.advanced_trainers;
create trigger advanced_trainer_delete_rights before delete on public.advanced_trainers
  for each row execute function public.check_advanced_trainer_delete();

drop policy if exists "write advanced trainers" on public.advanced_trainers;
create policy "insert advanced trainers" on public.advanced_trainers for insert
  with check (public.can_edit(centre_id, 'advanced_ict') or public.can_edit(centre_id, 'advanced_green'));
create policy "update advanced trainers" on public.advanced_trainers for update
  using (public.can_edit(centre_id, 'advanced_ict') or public.can_edit(centre_id, 'advanced_green'))
  with check (public.can_edit(centre_id, 'advanced_ict') or public.can_edit(centre_id, 'advanced_green'));
create policy "delete advanced trainers" on public.advanced_trainers for delete
  using (public.can_edit(centre_id, 'advanced_ict') or public.can_edit(centre_id, 'advanced_green'));
