-- Migration 20261105115640 · advanced_programme_progress
-- Exported from the Supabase migration history (applied in production).

-- Monthly progress of the advanced student programme (delivered by DigiFemme; iOS removed)
create table if not exists public.advanced_progress (
  centre_id text not null references public.centres(id) on delete cascade,
  item_key text not null,
  completed boolean not null default false,
  completed_date date,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (centre_id, item_key)
);
alter table public.advanced_progress enable row level security;
create policy "read advanced progress" on public.advanced_progress for select using (true);
create policy "write advanced progress" on public.advanced_progress for all
  using (public.can_edit(centre_id, 'advanced')) with check (public.can_edit(centre_id, 'advanced'));
