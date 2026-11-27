-- Migration 20261105125540 · reads_require_sign_in
-- Exported from the Supabase migration history (applied in production).

-- Only signed-in users can read the dashboard data (centres stay readable for the sign-up list)
drop policy if exists "read infrastructure" on public.centre_infrastructure;
create policy "read infrastructure" on public.centre_infrastructure for select to authenticated using (true);

drop policy if exists "read training basic" on public.centre_training_basic;
create policy "read training basic" on public.centre_training_basic for select to authenticated using (true);

drop policy if exists "read basic modules" on public.centre_basic_modules;
create policy "read basic modules" on public.centre_basic_modules for select to authenticated using (true);

drop policy if exists "read greenpreneur" on public.centre_greenpreneur;
create policy "read greenpreneur" on public.centre_greenpreneur for select to authenticated using (true);

drop policy if exists "read advanced trainers" on public.advanced_trainers;
create policy "read advanced trainers" on public.advanced_trainers for select to authenticated using (true);

drop policy if exists "read advanced students" on public.centre_training_advanced;
create policy "read advanced students" on public.centre_training_advanced for select to authenticated using (true);

drop policy if exists "read cohorts" on public.advanced_cohorts;
create policy "read cohorts" on public.advanced_cohorts for select to authenticated using (true);

drop policy if exists "read cohort progress" on public.advanced_cohort_progress;
create policy "read cohort progress" on public.advanced_cohort_progress for select to authenticated using (true);

drop policy if exists "read cohort venues" on public.advanced_cohort_centres;
create policy "read cohort venues" on public.advanced_cohort_centres for select to authenticated using (true);
