-- Migration 20261106161741 · centre_advanced_programme
-- Exported from the Supabase migration history (applied in production).

create table if not exists public.centre_advanced_programme (
  centre_id text not null references public.centres(id) on delete cascade,
  programme text not null check (programme in ('ui_ux','ios','android','green_business')),
  enrolled integer not null default 0 check (enrolled >= 0),
  completed integer not null default 0 check (completed >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (centre_id, programme)
);
alter table public.centre_advanced_programme enable row level security;
create policy "read advanced programme" on public.centre_advanced_programme for select using (true);
create policy "write advanced programme" on public.centre_advanced_programme for all
  using (public.can_edit(centre_id, 'advanced_ict') or public.can_edit(centre_id, 'advanced_green'))
  with check (public.can_edit(centre_id, 'advanced_ict') or public.can_edit(centre_id, 'advanced_green'));
