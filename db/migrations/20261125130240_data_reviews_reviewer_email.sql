-- Migration 20261125130240 · data_reviews_reviewer_email
-- Exported from the Supabase migration history (applied in production).

alter table public.data_reviews add column if not exists reviewed_by_email text;
update public.data_reviews r set reviewed_by_email = u.email from auth.users u where u.id = r.reviewed_by and r.reviewed_by_email is null;
