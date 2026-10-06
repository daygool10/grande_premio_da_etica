-- ============================================
-- W6(c) - retencao de partidas abandonadas
-- ============================================

-- Sem updated_at nao da para medir abandono: um jogo que ninguem toca e um jogo que acabou.
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.games_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS games_touch_updated_at ON public.games;
CREATE TRIGGER games_touch_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION public.games_touch_updated_at();

-- Apaga partidas abandonadas. Nunca a partida do proprio admin, nunca as keep_newest mais recentes.
CREATE OR REPLACE FUNCTION public.rpc_cleanup_games(
  p_game_id uuid,
  p_admin_session_token text,
  p_keep_newest integer DEFAULT 5,
  p_empty_lobby_minutes integer DEFAULT 60,
  p_abandoned_hours integer DEFAULT 24
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  l_deleted_codes text[];
  l_before integer;
BEGIN
  IF NOT public.admin_session_valid(p_game_id, p_admin_session_token) THEN
    RAISE EXCEPTION 'Invalid or missing admin session token';
  END IF;

  IF p_keep_newest < 1 THEN
    RAISE EXCEPTION 'keep_newest must be at least 1';
  END IF;

  IF p_empty_lobby_minutes < 1 THEN
    RAISE EXCEPTION 'empty_lobby_minutes must be at least 1';
  END IF;

  IF p_abandoned_hours < 1 THEN
    RAISE EXCEPTION 'abandoned_hours must be at least 1';
  END IF;

  SELECT count(*) INTO l_before FROM public.games AS game;

  WITH keep AS (
    SELECT game.id
    FROM public.games AS game
    ORDER BY game.created_at DESC, game.id DESC
    LIMIT p_keep_newest
  ),
  doomed AS (
    SELECT game.id
    FROM public.games AS game
    WHERE game.id <> p_game_id
      AND game.id NOT IN (SELECT keep.id FROM keep)
      AND (
        (
          NOT EXISTS (SELECT 1 FROM public.players AS player WHERE player.game_id = game.id)
          AND game.created_at < now() - make_interval(mins => p_empty_lobby_minutes)
        )
        OR game.updated_at < now() - make_interval(hours => p_abandoned_hours)
      )
  ),
  removed AS (
    DELETE FROM public.games AS game
    WHERE game.id IN (SELECT doomed.id FROM doomed)
    RETURNING game.game_code
  )
  SELECT COALESCE(array_agg(removed.game_code ORDER BY removed.game_code), ARRAY[]::text[])
  INTO l_deleted_codes
  FROM removed;

  RETURN jsonb_build_object(
    'deleted', cardinality(l_deleted_codes),
    'codes', to_jsonb(l_deleted_codes),
    'games_before', l_before,
    'games_after', l_before - cardinality(l_deleted_codes)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_cleanup_games(uuid, text, integer, integer, integer)
  TO anon, authenticated;
