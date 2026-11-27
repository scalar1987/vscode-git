-- Migration 20261110163626 · signup_allowlist
-- Exported from the Supabase migration history (applied in production).

create table if not exists public.signup_allowlist (
  email text primary key,
  note text,
  added_at timestamptz not null default now()
);
alter table public.signup_allowlist enable row level security;
create policy "read signup allowlist" on public.signup_allowlist for select using (true);

-- Centre coordinators (106 trainers) may sign up with the emails GGGI already holds
insert into public.signup_allowlist (email, note)
select lower(email), 'Centre coordinator' from public.centre_coordinators
on conflict (email) do nothing;

-- Any new sign-up must be @gggi.org or on the allowlist; everyone else is refused
create or replace function public.guard_signup()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if lower(new.email) like '%@gggi.org'
     or exists (select 1 from public.signup_allowlist a where a.email = lower(new.email)) then
    return new;
  end if;
  raise exception 'Sign-up is closed for this email. Ask GGGI to approve it.';
end;
$$;

drop trigger if exists guard_signup on auth.users;
create trigger guard_signup before insert on auth.users
  for each row execute function public.guard_signup();

-- Yvan is a GGGI approver: give him the GGGI role
update public.profiles set role = 'ggg'
where user_id = (select id from auth.users where email = 'user3@example.org');
