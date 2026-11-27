-- Migration 20261125121343 · review_decision_history
-- Exported from the Supabase migration history (applied in production).

create table if not exists public.review_decisions (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_key text not null,
  track text not null,
  action text not null,           -- approved | rejected | changes_requested | reset_by_edit
  comment text,
  actor_email text,
  acted_at timestamptz not null default now()
);
create index if not exists review_decisions_unit_idx on public.review_decisions (table_name, record_key, track, acted_at);

-- Append-only log: no client policies, reads go through my_review_history()
alter table public.review_decisions enable row level security;
revoke all on public.review_decisions from anon, authenticated;

create or replace function public.log_review_decision()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    -- A partner's edit clears the review (reset_review_on_change): record it as a reset
    insert into public.review_decisions (table_name, record_key, track, action, comment, actor_email)
    values (old.table_name, old.record_key, old.track, 'reset_by_edit', null, auth.jwt() ->> 'email');
    return old;
  end if;
  insert into public.review_decisions (table_name, record_key, track, action, comment, actor_email)
  values (new.table_name, new.record_key, new.track, new.status, new.comment, auth.jwt() ->> 'email');
  return new;
end $$;

drop trigger if exists log_review_decision_ins_upd on public.data_reviews;
create trigger log_review_decision_ins_upd
after insert or update on public.data_reviews
for each row execute function public.log_review_decision();

drop trigger if exists log_review_decision_del on public.data_reviews;
create trigger log_review_decision_del
after delete on public.data_reviews
for each row execute function public.log_review_decision();

-- Backfill the reviews that already exist (one entry each, actor from reviewed_by)
insert into public.review_decisions (table_name, record_key, track, action, comment, actor_email, acted_at)
select r.table_name, r.record_key, r.track, r.status, r.comment, u.email, coalesce(r.reviewed_at, now())
from public.data_reviews r
left join auth.users u on u.id = r.reviewed_by;

-- Partner view: decisions on units they submitted (no reviewer emails returned)
create or replace function public.my_review_history()
returns table (table_name text, record_key text, track text, action text, comment text, acted_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select h.table_name, h.record_key, h.track, h.action, h.comment, h.acted_at
  from public.review_decisions h
  where exists (
    select 1 from public.review_outbox o
    where o.submitted_by = (auth.jwt() ->> 'email')
      and o.table_name = h.table_name and o.record_key = h.record_key and o.track = h.track
  )
  order by h.acted_at desc;
$$;

revoke all on function public.my_review_history() from public;
grant execute on function public.my_review_history() to authenticated;
