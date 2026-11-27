-- Migration 20261110160231 · approver_scopes_and_track_reviews
-- Exported from the Supabase migration history (applied in production).

create table if not exists public.approver_scopes (
  email text primary key,
  scope text[] not null
);
alter table public.approver_scopes enable row level security;
create policy "read approver scopes" on public.approver_scopes for select using (true);
create policy "full approvers manage scopes" on public.approver_scopes for all
  using (exists (select 1 from public.approver_scopes s where s.email = (auth.jwt() ->> 'email') and 'all' = any(s.scope)))
  with check (exists (select 1 from public.approver_scopes s where s.email = (auth.jwt() ->> 'email') and 'all' = any(s.scope)));

insert into public.approver_scopes (email, scope) values
  ('user1@example.org', array['all']),
  ('user2@example.org', array['all']),
  ('user3@example.org', array['ict_tot','student','infra']),
  ('user4@example.org', array['green_tot','student','greenpreneur'])
on conflict (email) do update set scope = excluded.scope;

-- which approver scope a review unit needs
create or replace function public.required_scope(t text, tr text)
returns text language sql immutable as $$
  select case
    when t in ('advanced_trainers', 'tot_trainees') and tr = 'ict' then 'ict_tot'
    when t in ('advanced_trainers', 'tot_trainees') and tr = 'green' then 'green_tot'
    when t in ('advanced_cohort_centres', 'centre_training_basic', 'centre_basic_modules') then 'student'
    when t = 'centre_infrastructure' then 'infra'
    when t in ('greenpreneur_cohorts', 'greenpreneur_pitch_results') then 'greenpreneur'
    else 'all'
  end;
$$;

alter table public.data_reviews add column if not exists track text not null default 'all' check (track in ('all','ict','green'));
alter table public.data_reviews drop constraint if exists data_reviews_pkey;
alter table public.data_reviews add primary key (table_name, record_key, track);

drop policy if exists "ggg writes data reviews" on public.data_reviews;
create policy "scoped approvers write reviews" on public.data_reviews for all
  using (exists (select 1 from public.approver_scopes s where s.email = (auth.jwt() ->> 'email')
    and ('all' = any(s.scope) or public.required_scope(table_name, track) = any(s.scope))))
  with check (exists (select 1 from public.approver_scopes s where s.email = (auth.jwt() ->> 'email')
    and ('all' = any(s.scope) or public.required_scope(table_name, track) = any(s.scope))));
