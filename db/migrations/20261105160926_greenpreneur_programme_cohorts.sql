-- Migration 20261105160926 · greenpreneur_programme_cohorts
-- Exported from the Supabase migration history (applied in production).

create table if not exists greenpreneur_cohorts (
  id uuid primary key default gen_random_uuid(),
  track text not null check (track in ('training', 'irp')),
  name text not null,
  start_date date,
  end_date date,
  enrolled integer not null default 0 check (enrolled >= 0),
  created_at timestamptz not null default now()
);

create table if not exists greenpreneur_cohort_progress (
  cohort_id uuid not null references greenpreneur_cohorts(id) on delete cascade,
  item_no integer not null check (item_no between 0 and 99),
  completed boolean not null default false,
  completed_date date,
  completed_at timestamptz,
  updated_at timestamptz,
  updated_by uuid,
  primary key (cohort_id, item_no)
);

create table if not exists greenpreneur_centres (
  centre_id text primary key references centres(id) on delete cascade
);

alter table greenpreneur_cohorts enable row level security;
alter table greenpreneur_cohort_progress enable row level security;
alter table greenpreneur_centres enable row level security;

create policy "read greenpreneur cohorts" on greenpreneur_cohorts for select using (true);
create policy "read greenpreneur progress" on greenpreneur_cohort_progress for select using (true);
create policy "read greenpreneur centres" on greenpreneur_centres for select using (true);

create policy "write greenpreneur cohorts" on greenpreneur_cohorts for insert with check (exists (select 1 from profiles p where p.user_id = auth.uid() and (p.role = 'ggg' or (p.role = 'partner' and 'greenpreneur' = any (p.section_access)))));
create policy "update greenpreneur cohorts" on greenpreneur_cohorts for update using (exists (select 1 from profiles p where p.user_id = auth.uid() and (p.role = 'ggg' or (p.role = 'partner' and 'greenpreneur' = any (p.section_access))))) with check (exists (select 1 from profiles p where p.user_id = auth.uid() and (p.role = 'ggg' or (p.role = 'partner' and 'greenpreneur' = any (p.section_access)))));
create policy "delete greenpreneur cohorts ggg only" on greenpreneur_cohorts for delete using (exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'ggg'));

create policy "write greenpreneur progress" on greenpreneur_cohort_progress for all using (exists (select 1 from profiles p where p.user_id = auth.uid() and (p.role = 'ggg' or (p.role = 'partner' and 'greenpreneur' = any (p.section_access))))) with check (exists (select 1 from profiles p where p.user_id = auth.uid() and (p.role = 'ggg' or (p.role = 'partner' and 'greenpreneur' = any (p.section_access)))));

create policy "write greenpreneur centres" on greenpreneur_centres for all using (exists (select 1 from profiles p where p.user_id = auth.uid() and (p.role = 'ggg' or (p.role = 'partner' and 'greenpreneur' = any (p.section_access))))) with check (exists (select 1 from profiles p where p.user_id = auth.uid() and (p.role = 'ggg' or (p.role = 'partner' and 'greenpreneur' = any (p.section_access)))));
