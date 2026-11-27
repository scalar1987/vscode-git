-- Migration 20261125121004 · pitch_prize_decimal
-- Exported from the Supabase migration history (applied in production).

alter table public.greenpreneur_pitch_results alter column prize_usd type numeric(12,2) using prize_usd::numeric(12,2);
