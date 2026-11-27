-- Migration 20261110154715 · data_reviews_advanced
-- Exported from the Supabase migration history (applied in production).

create table if not exists public.data_reviews (
  table_name text not null check (table_name in ('advanced_trainers','advanced_cohort_centres')),
  record_key text not null,
  status text not null check (status in ('approved','rejected','changes_requested')),
  comment text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz not null default now(),
  primary key (table_name, record_key)
);
alter table public.data_reviews enable row level security;
create policy "read data reviews" on public.data_reviews for select using (true);
create policy "ggg writes data reviews" on public.data_reviews for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'ggg'))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'ggg'));

-- Any change to partner-entered data sends the record back to review
create or replace function public.reset_review_on_change()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if tg_table_name = 'advanced_trainers' then
    delete from public.data_reviews where table_name = 'advanced_trainers' and record_key = new.id::text;
  elsif tg_table_name = 'advanced_cohort_centres' then
    delete from public.data_reviews where table_name = 'advanced_cohort_centres' and record_key = new.cohort_id::text || '|' || new.centre_id;
  end if;
  return new;
end;
$$;

drop trigger if exists reset_review_trainers on public.advanced_trainers;
create trigger reset_review_trainers after update on public.advanced_trainers
  for each row execute function public.reset_review_on_change();
drop trigger if exists reset_review_cohort_centres on public.advanced_cohort_centres;
create trigger reset_review_cohort_centres after update on public.advanced_cohort_centres
  for each row execute function public.reset_review_on_change();
