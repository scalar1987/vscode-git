-- Migration 20261105095721 · regrant_can_edit_centre_authenticated
-- Exported from the Supabase migration history (applied in production).

-- RLS policies evaluate this function as the signed-in role, so authenticated must keep EXECUTE.
-- anon is revoked (done in the previous migration); it only reveals whether the caller may edit.
grant execute on function public.can_edit_centre(text) to authenticated;
