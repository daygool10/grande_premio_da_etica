-- Migration: race_length column + the two missing uniqueness constraints.
--
-- Every statement is idempotent, so this file can be run more than once.
-- Verified against the live project on 2026-09-26: answers had 111 rows and games
-- had 70 rows, with zero duplicate (game_id, player_id, question_index) groups and
-- zero duplicate game_code values, so both index creations succeed on current data.
--
-- Apply this in the Supabase SQL editor. It cannot be applied with the anon key,
-- because the anon key has no DDL rights.

-- 1. How many questions the admin chose for this race (10, 20 or 35).
--    The client falls back to 20 when the column is absent or null, so the app
--    keeps working before this migration is applied.
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS race_length integer NOT NULL DEFAULT 20;

-- 2. One answer per player per question.
--    Without this, a refresh mid-submit or a second tab inserts a second row, and
--    the reveal step silently counts whichever row the database returns last.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.answers
    GROUP BY game_id, player_id, question_index
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate answers exist for the same player and question. Resolve them before applying this migration.';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS answers_game_player_question_unique
  ON public.answers (game_id, player_id, question_index);

-- 3. Game codes must be unique.
--    joinGame looks a code up with a single-row query, which errors if two games
--    ever share a code.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.games
    GROUP BY game_code
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate game codes exist. Resolve them before applying this migration.';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS games_game_code_unique
  ON public.games (game_code);
