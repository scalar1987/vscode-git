-- Migration 20261105095847 · coordinator_contacts_signed_in_only
-- Exported from the Supabase migration history (applied in production).

-- Coordinator contact details and trainee names are visible to signed-in users only
drop policy if exists "read coordinators" on public.centre_coordinators;
create policy "read coordinators (signed in)" on public.centre_coordinators
  for select to authenticated using (true);

drop policy if exists "read tot" on public.tot_trainees;
create policy "read tot (signed in)" on public.tot_trainees
  for select to authenticated using (true);
