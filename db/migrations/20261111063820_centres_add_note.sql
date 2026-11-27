-- Migration 20261111063820 · centres_add_note
-- Exported from the Supabase migration history (applied in production).

alter table public.centres add column if not exists note text;
update public.centres set note = 'Per progress report of 05 Nov 2026: classroom not confirmed (probable change of room). Works not started.' where id = 'treichville_comm_1';
