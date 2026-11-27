-- Migration 20261125154206 · centre_tot_evidence
-- Exported from the Supabase migration history (applied in production).

-- Basic ToT evidence: one link per centre and track (ICT, Green).
-- Written by the partner that holds that track (Betterworld = ICT, Impact Lab = Green) and by GGGI.
create table if not exists public.centre_tot_evidence (
  centre_id text not null references public.centres(id) on delete cascade,
  track text not null check (track in ('ict', 'green')),
  evidence_url text,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (centre_id, track)
);

alter table public.centre_tot_evidence enable row level security;

drop policy if exists "read centre tot evidence" on public.centre_tot_evidence;
create policy "read centre tot evidence" on public.centre_tot_evidence for select to authenticated using (true);

drop policy if exists "write centre tot evidence" on public.centre_tot_evidence;
create policy "write centre tot evidence" on public.centre_tot_evidence for all to authenticated
  using (
    (track = 'ict' and public.can_edit(centre_id, 'tot_ict'))
    or (track = 'green' and public.can_edit(centre_id, 'tot_green'))
  )
  with check (
    (track = 'ict' and public.can_edit(centre_id, 'tot_ict'))
    or (track = 'green' and public.can_edit(centre_id, 'tot_green'))
  );
