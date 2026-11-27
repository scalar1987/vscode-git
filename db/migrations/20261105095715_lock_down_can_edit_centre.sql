-- Migration 20261105095715 · lock_down_can_edit_centre
-- Exported from the Supabase migration history (applied in production).

revoke execute on function public.can_edit_centre(text) from public, anon;
revoke execute on function public.can_edit_centre(text) from authenticated;
