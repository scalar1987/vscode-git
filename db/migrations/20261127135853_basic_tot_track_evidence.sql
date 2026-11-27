-- Migration 20261127135853 · basic_tot_track_evidence
-- Exported from the Supabase migration history (applied in production).

-- Basic ToT evidence: one folder link per track (ICT by Betterworld, Green by Impact Lab), programme-wide
create table public.tot_track_evidence (
  track text primary key check (track in ('ict', 'green')),
  evidence_url text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.tot_track_evidence enable row level security;
create policy "read tot track evidence" on public.tot_track_evidence for select to authenticated using (true);
create policy "write tot track evidence" on public.tot_track_evidence for all to authenticated
  using ((track = 'ict' and public.can_edit(null, 'tot_ict')) or (track = 'green' and public.can_edit(null, 'tot_green')))
  with check ((track = 'ict' and public.can_edit(null, 'tot_ict')) or (track = 'green' and public.can_edit(null, 'tot_green')));
insert into public.tot_track_evidence (track) values ('ict'), ('green');
