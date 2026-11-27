-- Migration 20261105164819 · greenpreneur_pitch_results
-- Exported from the Supabase migration history (applied in production).

create table if not exists greenpreneur_pitch_results (
  id uuid primary key default gen_random_uuid(),
  edition integer not null check (edition between 2000 and 2100),
  category text not null check (category in ('Operating entrepreneurs', 'Aspiring entrepreneurs')),
  rank_no integer not null check (rank_no >= 1),
  laureate text not null,
  prize_usd integer not null default 0 check (prize_usd >= 0),
  created_at timestamptz not null default now()
);
alter table greenpreneur_pitch_results enable row level security;
create policy "read greenpreneur pitch results" on greenpreneur_pitch_results for select using (true);
create policy "write greenpreneur pitch results" on greenpreneur_pitch_results for all using (exists (select 1 from profiles p where p.user_id = auth.uid() and (p.role = 'ggg' or (p.role = 'partner' and 'greenpreneur' = any (p.section_access))))) with check (exists (select 1 from profiles p where p.user_id = auth.uid() and (p.role = 'ggg' or (p.role = 'partner' and 'greenpreneur' = any (p.section_access)))));
