-- Migration 20261105111023 · advanced_trainers_and_students
-- Exported from the Supabase migration history (applied in production).

-- Advanced permission section
alter table public.profiles drop constraint if exists profiles_section_access_check;
alter table public.profiles add constraint profiles_section_access_check
  check (section_access <@ array['tot','infra','greenpreneur','advanced']::text[]);

-- DigiFemme advanced trainers, assigned per centre (in-person + four LMS modules)
create table if not exists public.advanced_trainers (
  id uuid primary key default gen_random_uuid(),
  centre_id text not null references public.centres(id) on delete cascade,
  name text not null,
  in_person_completed boolean not null default false,
  in_person_date date,
  lms_ui_ux boolean not null default false,
  lms_ios boolean not null default false,
  lms_android boolean not null default false,
  lms_green_business boolean not null default false,
  lms_completed boolean generated always as (lms_ui_ux and lms_ios and lms_android and lms_green_business) stored,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Advanced students: yearly enrolled / passed per centre
create table if not exists public.centre_training_advanced (
  centre_id text not null references public.centres(id) on delete cascade,
  year smallint not null,
  enrolled integer not null default 0,
  passed integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (centre_id, year)
);

alter table public.advanced_trainers enable row level security;
alter table public.centre_training_advanced enable row level security;
create policy "read advanced trainers" on public.advanced_trainers for select using (true);
create policy "read advanced students" on public.centre_training_advanced for select using (true);
create policy "write advanced trainers" on public.advanced_trainers for all
  using (public.can_edit(centre_id, 'advanced')) with check (public.can_edit(centre_id, 'advanced'));
create policy "write advanced students" on public.centre_training_advanced for all
  using (public.can_edit(centre_id, 'advanced')) with check (public.can_edit(centre_id, 'advanced'));

-- Permission check: GGGI everything; partner by section; centre trainer for own centre
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
        or (p.role = 'coordinator' and p.centre_id = c and s in ('infra','tot','training','advanced'))
      )
  );
$$;
