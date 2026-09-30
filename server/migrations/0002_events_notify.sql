-- ============================================
-- Migração 0002: notify de eventos de partida
-- Publica mudanças em games, players e answers
-- no canal "game_events" via pg_notify, com um
-- payload json pequeno (só ids e o essencial).
-- A API usa esse canal para empurrar eventos via
-- SSE e eliminar a dependência do polling.
-- ============================================

DO $$
DECLARE
  existing_games_columns integer;
BEGIN
  SELECT COUNT(*)
  INTO existing_games_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'games'
    AND column_name IN ('phase', 'question_revealed', 'current_question_index');

  IF existing_games_columns <> 3 THEN
    RAISE EXCEPTION
      'games is missing one of phase, question_revealed, current_question_index; aborting events migration, update init.sql first.';
  END IF;
END
$$;

-- Notifica uma mudança em games, players ou answers.
-- O payload fica bem abaixo do limite de 8000 bytes:
-- tabela, operação, id da linha e game_id dono; para
-- games inclui também os campos acionáveis. Nunca envia
-- a linha inteira nem colunas de texto grandes.
CREATE OR REPLACE FUNCTION public.notify_game_event()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  row_game_id uuid;
  payload jsonb;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW IS NOT DISTINCT FROM OLD THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'games' THEN
    row_game_id := COALESCE(NEW.id, OLD.id);
  ELSE
    row_game_id := COALESCE(NEW.game_id, OLD.game_id);
  END IF;

  payload := jsonb_build_object(
    'table', TG_TABLE_NAME,
    'op', TG_OP,
    'id', COALESCE(NEW.id, OLD.id),
    'game_id', row_game_id
  );

  IF TG_TABLE_NAME = 'games' THEN
    payload := payload || jsonb_build_object(
      'phase', COALESCE(NEW.phase, OLD.phase),
      'question_revealed', COALESCE(NEW.question_revealed, OLD.question_revealed),
      'current_question_index', COALESCE(NEW.current_question_index, OLD.current_question_index)
    );
  END IF;

  PERFORM pg_notify('game_events', payload::text);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS games_notify_event ON public.games;
CREATE TRIGGER games_notify_event
  AFTER INSERT OR UPDATE OR DELETE ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_game_event();

DROP TRIGGER IF EXISTS players_notify_event ON public.players;
CREATE TRIGGER players_notify_event
  AFTER INSERT OR UPDATE OR DELETE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_game_event();

DROP TRIGGER IF EXISTS answers_notify_event ON public.answers;
CREATE TRIGGER answers_notify_event
  AFTER INSERT OR UPDATE OR DELETE ON public.answers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_game_event();