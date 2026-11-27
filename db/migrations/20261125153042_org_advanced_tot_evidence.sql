-- Migration 20261125153042 · org_advanced_tot_evidence
-- Exported from the Supabase migration history (applied in production).

-- One evidence link per partner organisation for advanced ToT (not per centre or per trainer).
-- Each organisation's own users can set their link; GGGI can set all of them.
create table if not exists public.org_evidence (
  org text primary key,
  evidence_url text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.org_evidence enable row level security;

drop policy if exists "read org evidence" on public.org_evidence;
create policy "read org evidence" on public.org_evidence for select to authenticated using (true);

drop policy if exists "write own org evidence" on public.org_evidence;
create policy "write own org evidence" on public.org_evidence for update to authenticated
  using (
    exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'ggg')
    or (auth.jwt() -> 'user_metadata' ->> 'org') = org
  )
  with check (
    exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'ggg')
    or (auth.jwt() -> 'user_metadata' ->> 'org') = org
  );

insert into public.org_evidence (org) values ('DigiFemme'), ('Impact Lab'), ('Betterworld')
  on conflict (org) do nothing;
