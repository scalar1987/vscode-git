-- Migration 20261125130324 · revert_data_reviews_reviewer_email
-- Exported from the Supabase migration history (applied in production).

alter table public.data_reviews drop column if exists reviewed_by_email;
