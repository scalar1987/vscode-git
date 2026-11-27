-- Migration 20261125133818 · coordinators_student_training_only
-- Exported from the Supabase migration history (applied in production).

-- Basic trainers (coordinators): student training for their own centre only.
create or replace function public.can_edit(c text, s text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and (
        p.role = 'ggg'
        or (p.role = 'partner' and s = any (p.section_access))
        or (p.role = 'coordinator' and p.centre_id = c and s = 'training')
      )
  );
$$;
