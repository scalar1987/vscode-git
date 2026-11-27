-- Migration 20261105165846 · input_change_log
-- Exported from the Supabase migration history (applied in production).

create table if not exists input_change_log (
  id bigserial primary key,
  table_name text not null,
  operation text not null,
  centre_id text,
  cohort_id text,
  changed_by uuid,
  changed_at timestamptz not null default now(),
  included_in_digest boolean not null default false
);

alter table input_change_log enable row level security;
create policy "ggg read input change log" on input_change_log for select using (exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'ggg'));

create or replace function log_input_change() returns trigger language plpgsql security definer set search_path = public as $$
declare
  j jsonb;
begin
  if tg_op = 'DELETE' then j := to_jsonb(old); else j := to_jsonb(new); end if;
  insert into input_change_log (table_name, operation, centre_id, cohort_id, changed_by)
  values (
    tg_table_name,
    tg_op,
    j->>'centre_id',
    coalesce(j->>'cohort_id', case when tg_table_name in ('advanced_cohorts', 'greenpreneur_cohorts') then j->>'id' end),
    auth.uid()
  );
  return null;
end $$;

create trigger log_change_tot_trainees after insert or update or delete on tot_trainees for each row execute function log_input_change();
create trigger log_change_centre_infrastructure after insert or update or delete on centre_infrastructure for each row execute function log_input_change();
create trigger log_change_centre_training_basic after insert or update or delete on centre_training_basic for each row execute function log_input_change();
create trigger log_change_centre_basic_modules after insert or update or delete on centre_basic_modules for each row execute function log_input_change();
create trigger log_change_advanced_trainers after insert or update or delete on advanced_trainers for each row execute function log_input_change();
create trigger log_change_centre_training_advanced after insert or update or delete on centre_training_advanced for each row execute function log_input_change();
create trigger log_change_centre_greenpreneur after insert or update or delete on centre_greenpreneur for each row execute function log_input_change();
create trigger log_change_advanced_cohorts after insert or update or delete on advanced_cohorts for each row execute function log_input_change();
create trigger log_change_advanced_cohort_progress after insert or update or delete on advanced_cohort_progress for each row execute function log_input_change();
create trigger log_change_advanced_cohort_centres after insert or update or delete on advanced_cohort_centres for each row execute function log_input_change();
create trigger log_change_greenpreneur_cohorts after insert or update or delete on greenpreneur_cohorts for each row execute function log_input_change();
create trigger log_change_greenpreneur_cohort_progress after insert or update or delete on greenpreneur_cohort_progress for each row execute function log_input_change();
create trigger log_change_greenpreneur_centres after insert or update or delete on greenpreneur_centres for each row execute function log_input_change();
create trigger log_change_greenpreneur_pitch_results after insert or update or delete on greenpreneur_pitch_results for each row execute function log_input_change();
