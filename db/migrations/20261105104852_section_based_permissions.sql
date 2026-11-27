-- Migration 20261105104852 · section_based_permissions
-- Exported from the Supabase migration history (applied in production).

-- Partner sections: 'tot' (implementing partners), 'infra' (SNDI, Dakyung), 'greenpreneur' (Barka Fund)
alter table public.profiles add column if not exists section_access text[] not null default '{}';
alter table public.profiles drop constraint if exists profiles_section_access_check;
alter table public.profiles add constraint profiles_section_access_check
  check (section_access <@ array['tot','infra','greenpreneur']::text[]);

-- One permission check for every input area
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
        or (p.role = 'coordinator' and p.centre_id = c and s in ('infra','tot','training'))
      )
  );
$$;
revoke execute on function public.can_edit(text, text) from public, anon;
grant execute on function public.can_edit(text, text) to authenticated;

-- Greenpreneur data (pitch competition / incubation per year) per centre
create table if not exists public.centre_greenpreneur (
  centre_id text primary key references public.centres(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.centre_greenpreneur enable row level security;
create policy "read greenpreneur" on public.centre_greenpreneur for select using (true);
create policy "write greenpreneur" on public.centre_greenpreneur for all
  using (public.can_edit(centre_id, 'greenpreneur')) with check (public.can_edit(centre_id, 'greenpreneur'));

-- Re-point the write policies to the section-based check
drop policy if exists "write infrastructure" on public.centre_infrastructure;
create policy "write infrastructure" on public.centre_infrastructure for all
  using (public.can_edit(centre_id, 'infra')) with check (public.can_edit(centre_id, 'infra'));

drop policy if exists "write tot" on public.tot_trainees;
create policy "write tot" on public.tot_trainees for all
  using (public.can_edit(centre_id, 'tot')) with check (public.can_edit(centre_id, 'tot'));

drop policy if exists "write training basic" on public.centre_training_basic;
create policy "write training basic" on public.centre_training_basic for all
  using (public.can_edit(centre_id, 'training')) with check (public.can_edit(centre_id, 'training'));

drop policy if exists "write basic modules" on public.centre_basic_modules;
create policy "write basic modules" on public.centre_basic_modules for all
  using (public.can_edit(centre_id, 'training')) with check (public.can_edit(centre_id, 'training'));

-- Centre master data and coordinator contacts: GGGI only (partners no longer edit these)
drop policy if exists "write centres" on public.centres;
create policy "write centres" on public.centres for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'ggg'))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'ggg'));
drop policy if exists "write coordinators" on public.centre_coordinators;
create policy "write coordinators" on public.centre_coordinators for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'ggg'))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'ggg'));

-- The old helper is no longer used by any policy
drop function if exists public.can_edit_centre(text);
