-- Migration 20261110163410 · greenpreneur_pitch_editions
-- Exported from the Supabase migration history (applied in production).

create table if not exists public.greenpreneur_pitch_editions (
  edition integer primary key,
  name text,
  held_on date,
  created_at timestamptz not null default now()
);
alter table public.greenpreneur_pitch_editions enable row level security;
create policy "read pitch editions" on public.greenpreneur_pitch_editions for select using (true);
create policy "write pitch editions" on public.greenpreneur_pitch_editions for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and (p.role = 'ggg' or (p.role = 'partner' and 'greenpreneur' = any(p.section_access)))))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and (p.role = 'ggg' or (p.role = 'partner' and 'greenpreneur' = any(p.section_access)))));
-- every result belongs to a competition that was created first
insert into public.greenpreneur_pitch_editions (edition) select distinct edition from public.greenpreneur_pitch_results on conflict do nothing;
alter table public.greenpreneur_pitch_results add constraint greenpreneur_pitch_results_edition_fkey
  foreign key (edition) references public.greenpreneur_pitch_editions(edition) on delete cascade;
