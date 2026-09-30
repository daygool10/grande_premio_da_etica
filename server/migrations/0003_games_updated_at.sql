-- ============================================
-- Migração 0003: relógio de inatividade em games
-- A política de retenção lê games.updated_at para
-- medir INATIVIDADE (um game "não tocado" há 14 dias,
-- ou um lobby vazio há 24 horas). O init.sql só criava
-- created_at, então a coluna não existia e o runner
-- morria com "column g.updated_at does not exist".
-- Esta migração adiciona a coluna e um trigger de
-- UPDATE que carimba now() em toda mudança de linha
-- (inclusive um UPDATE sem alteração real: tocado é
-- tocado). Convive com o trigger de notify da 0002,
-- que roda AFTER; este roda BEFORE.
-- ============================================

DO $$
DECLARE
  games_table integer;
BEGIN
  SELECT COUNT(*)
  INTO games_table
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'games';

  IF games_table = 0 THEN
    RAISE EXCEPTION
      'public.games does not exist; apply init.sql (or the migrations in order) before 0003.';
  END IF;
END
$$;

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.stamp_game_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS games_stamp_updated_at ON public.games;
CREATE TRIGGER games_stamp_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_game_updated_at();