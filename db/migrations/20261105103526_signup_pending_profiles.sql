-- Migration 20261105103526 · signup_pending_profiles
-- Exported from the Supabase migration history (applied in production).

-- Allow a 'pending' role for new sign-ups (no edit rights until approved)
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('pending','ggg','partner','coordinator'));

-- Create a pending profile automatically when someone signs up.
-- A coordinator requests a centre at sign-up; GGGI/partner roles are assigned by an admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  req_centre text := nullif(new.raw_user_meta_data->>'centre_id', '');
begin
  insert into public.profiles (user_id, role, centre_id, full_name)
  values (
    new.id,
    'pending',
    req_centre,
    nullif(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The trigger is not callable directly by users
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Users can see their own profile (already in place); pending users have no write rights
-- because can_edit_centre() only accepts ggg / partner / coordinator.;
