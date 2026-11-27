-- Migration 20261125121001 · tot_derive_completion_flags
-- Exported from the Supabase migration history (applied in production).

create or replace function public.tot_derive_flags()
returns trigger language plpgsql as $$
begin
  new.in_person_completed := coalesce(new.in_person_ict, false) and coalesce(new.in_person_green, false);
  new.lms_completed := coalesce(new.lms_word, false) and coalesce(new.lms_excel, false)
                       and coalesce(new.lms_ppt, false) and coalesce(new.lms_green, false);
  return new;
end $$;

drop trigger if exists derive_tot_flags on public.tot_trainees;
create trigger derive_tot_flags
before insert or update on public.tot_trainees
for each row execute function public.tot_derive_flags();
