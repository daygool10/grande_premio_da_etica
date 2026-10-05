-- ============================================
-- Etica F1 - Schema para Supabase (v2)
-- Rodar no SQL Editor do Supabase (New query -> RUN)
--
-- Arquitetura: 100% do acesso do frontend passa por RPCs SECURITY DEFINER.
-- Nenhuma tabela pública é exposta via PostgREST (RLS ativo + sem policy).
-- ============================================

-- ============================================
-- Tabelas
-- ============================================

CREATE TABLE IF NOT EXISTS public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_code text NOT NULL UNIQUE,
  admin_id text NOT NULL,
  admin_session_token text,
  current_question_index integer NOT NULL DEFAULT 0,
  question_order integer[],
  phase text NOT NULL DEFAULT 'waiting' CHECK (phase IN ('waiting', 'question', 'finished')),
  question_revealed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  team_name text NOT NULL,
  f1_team text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  is_connected boolean NOT NULL DEFAULT true,
  last_seen timestamptz NOT NULL DEFAULT now(),
  player_session_token text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  question_index integer NOT NULL,
  selected_option integer NOT NULL,
  is_correct boolean NOT NULL,
  response_time_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.players DROP COLUMN IF EXISTS skipped_turn;

CREATE TABLE IF NOT EXISTS public.private_game_admin_sessions (
  game_id uuid PRIMARY KEY REFERENCES public.games(id) ON DELETE CASCADE,
  session_token text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.private_player_sessions (
  player_id uuid PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
  session_token text NOT NULL
);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_game_admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_player_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.games FROM anon, authenticated;
REVOKE ALL ON public.players FROM anon, authenticated;
REVOKE ALL ON public.answers FROM anon, authenticated;
REVOKE ALL ON public.private_game_admin_sessions FROM anon, authenticated;
REVOKE ALL ON public.private_player_sessions FROM anon, authenticated;

-- ============================================
-- Índices
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS players_game_id_f1_team_unique
  ON public.players (game_id, f1_team);

CREATE INDEX IF NOT EXISTS idx_players_game_id ON public.players (game_id);
CREATE INDEX IF NOT EXISTS idx_answers_game_id ON public.answers (game_id);
CREATE INDEX IF NOT EXISTS idx_answers_player_id ON public.answers (player_id);
CREATE INDEX IF NOT EXISTS idx_answers_game_question ON public.answers (game_id, question_index);
CREATE INDEX IF NOT EXISTS idx_games_game_code ON public.games (game_code);

-- ============================================
-- TRIGGERS (iguais à v1)
-- ============================================

CREATE OR REPLACE FUNCTION public.capture_admin_session_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.admin_session_token IS NOT NULL THEN
    INSERT INTO public.private_game_admin_sessions (game_id, session_token)
    VALUES (NEW.id, NEW.admin_session_token)
    ON CONFLICT (game_id) DO UPDATE SET session_token = EXCLUDED.session_token;

    UPDATE public.games
    SET admin_session_token = NULL
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.capture_player_session_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.player_session_token IS NOT NULL THEN
    INSERT INTO public.private_player_sessions (player_id, session_token)
    VALUES (NEW.id, NEW.player_session_token)
    ON CONFLICT (player_id) DO UPDATE SET session_token = EXCLUDED.session_token;

    UPDATE public.players
    SET player_session_token = NULL
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS games_capture_admin_session_token ON public.games;
CREATE TRIGGER games_capture_admin_session_token
  AFTER INSERT ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_admin_session_token();

DROP TRIGGER IF EXISTS players_capture_session_token ON public.players;
CREATE TRIGGER players_capture_session_token
  AFTER INSERT ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_player_session_token();

-- ============================================
-- Helper: tipo de retorno do get_game_state
-- ============================================

-- ============================================
-- RPCs - Games
-- ============================================

-- Cria uma partida. Recebe o token do admin, o trigger captura e move pra private.
-- Retorna a partida SEM o token (já foi movido).
CREATE OR REPLACE FUNCTION public.rpc_create_game(
  p_game_code text,
  p_admin_id text,
  p_admin_session_token text,
  p_question_order integer[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_game public.games;
BEGIN
  INSERT INTO public.games (
    game_code, admin_id, admin_session_token,
    phase, current_question_index, question_order, question_revealed
  )
  VALUES (
    p_game_code, p_admin_id, p_admin_session_token,
    'waiting', 0, p_question_order, false
  )
  RETURNING * INTO new_game;

  RETURN to_jsonb(new_game) - 'admin_session_token';
END;
$$;

-- Busca partida por código (case-insensitive na entrada, mas armazenada em uppercase)
CREATE OR REPLACE FUNCTION public.rpc_get_game_by_code(p_game_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  found_game public.games;
BEGIN
  SELECT * INTO found_game
  FROM public.games
  WHERE game_code = upper(p_game_code);

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN to_jsonb(found_game) - 'admin_session_token';
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_game_by_id(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  found_game public.games;
BEGIN
  SELECT * INTO found_game FROM public.games WHERE id = p_game_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN to_jsonb(found_game) - 'admin_session_token';
END;
$$;

-- Atualiza campos permitidos da partida. Campos NULL são ignorados.
CREATE OR REPLACE FUNCTION public.rpc_update_game(
  p_game_id uuid,
  p_phase text DEFAULT NULL,
  p_current_question_index integer DEFAULT NULL,
  p_question_revealed boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  updated_game public.games;
BEGIN
  UPDATE public.games
  SET
    phase = COALESCE(p_phase, phase),
    current_question_index = COALESCE(p_current_question_index, current_question_index),
    question_revealed = COALESCE(p_question_revealed, question_revealed)
  WHERE id = p_game_id
  RETURNING * INTO updated_game;

  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN to_jsonb(updated_game) - 'admin_session_token';
END;
$$;

-- ============================================
-- RPCs - Players
-- ============================================

CREATE OR REPLACE FUNCTION public.rpc_create_player(
  p_game_id uuid,
  p_team_name text,
  p_f1_team text,
  p_player_session_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_player public.players;
BEGIN
  INSERT INTO public.players (
    game_id, team_name, f1_team, position, is_connected, last_seen, player_session_token
  )
  VALUES (
    p_game_id, p_team_name, p_f1_team, 0, true, now(), p_player_session_token
  )
  RETURNING * INTO new_player;

  RETURN to_jsonb(new_player) - 'player_session_token';
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_player_by_id(p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  found_player public.players;
BEGIN
  SELECT * INTO found_player FROM public.players WHERE id = p_player_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN to_jsonb(found_player) - 'player_session_token';
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_player_by_id_and_game(
  p_player_id uuid,
  p_game_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  found_player public.players;
BEGIN
  SELECT * INTO found_player
  FROM public.players
  WHERE id = p_player_id AND game_id = p_game_id;

  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN to_jsonb(found_player) - 'player_session_token';
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_players_by_game(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(to_jsonb(p) - 'player_session_token' ORDER BY p.created_at ASC), '[]'::jsonb)
  INTO result
  FROM public.players p
  WHERE p.game_id = p_game_id;

  RETURN result;
END;
$$;

-- Atualiza position/is_connected/last_seen de um jogador
CREATE OR REPLACE FUNCTION public.rpc_update_player(
  p_player_id uuid,
  p_position integer DEFAULT NULL,
  p_is_connected boolean DEFAULT NULL,
  p_last_seen timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  updated_player public.players;
BEGIN
  UPDATE public.players
  SET
    position = COALESCE(p_position, position),
    is_connected = COALESCE(p_is_connected, is_connected),
    last_seen = COALESCE(p_last_seen, last_seen)
  WHERE id = p_player_id
  RETURNING * INTO updated_player;

  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN to_jsonb(updated_player) - 'player_session_token';
END;
$$;

-- Atualiza vários players de uma vez. Recebe jsonb: [{id, position}, ...]
CREATE OR REPLACE FUNCTION public.rpc_batch_update_players(p_updates jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  item jsonb;
BEGIN
  IF p_updates IS NULL OR jsonb_array_length(p_updates) = 0 THEN
    RETURN false;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(p_updates) LOOP
    UPDATE public.players
    SET position = (item->>'position')::integer
    WHERE id = (item->>'id')::uuid;
  END LOOP;

  RETURN true;
END;
$$;

-- ============================================
-- RPCs - Answers
-- ============================================

CREATE OR REPLACE FUNCTION public.rpc_create_answer(
  p_game_id uuid,
  p_player_id uuid,
  p_question_index integer,
  p_selected_option integer,
  p_is_correct boolean,
  p_response_time_ms integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_answer public.answers;
  sanitized_ms integer;
BEGIN
  sanitized_ms := CASE
    WHEN p_response_time_ms IS NULL THEN NULL
    ELSE GREATEST(0, p_response_time_ms)
  END;

  INSERT INTO public.answers (
    game_id, player_id, question_index, selected_option, is_correct, response_time_ms
  )
  VALUES (
    p_game_id, p_player_id, p_question_index, p_selected_option, p_is_correct, sanitized_ms
  )
  RETURNING * INTO new_answer;

  RETURN to_jsonb(new_answer);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_answers_by_game(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.created_at ASC), '[]'::jsonb)
  INTO result
  FROM public.answers a
  WHERE a.game_id = p_game_id;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_answers_by_game_and_question(
  p_game_id uuid,
  p_question_index integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(to_jsonb(a)), '[]'::jsonb)
  INTO result
  FROM public.answers a
  WHERE a.game_id = p_game_id AND a.question_index = p_question_index;
  RETURN result;
END;
$$;

-- ============================================
-- RPCs - Sessões e presença (a v1 já tinha, mantidas)
-- ============================================

CREATE OR REPLACE FUNCTION public.admin_session_valid(
  p_game_id uuid,
  p_session_token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.private_game_admin_sessions
    WHERE game_id = p_game_id AND session_token = p_session_token
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.player_heartbeat(
  p_player_id uuid,
  p_session_token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.players AS player
  SET last_seen = now(),
      is_connected = true
  FROM public.private_player_sessions AS session
  WHERE player.id = p_player_id
    AND session.player_id = player.id
    AND session.session_token = p_session_token;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_offline_player(
  p_player_id uuid,
  p_admin_token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_game_id uuid;
  current_game_phase text;
  target_last_seen timestamptz;
BEGIN
  SELECT player.game_id INTO target_game_id
  FROM public.players AS player
  WHERE player.id = p_player_id;

  IF NOT FOUND THEN RETURN false; END IF;

  SELECT game.phase INTO current_game_phase
  FROM public.games AS game
  JOIN public.private_game_admin_sessions AS session
    ON session.game_id = game.id
  WHERE game.id = target_game_id
    AND session.session_token = p_admin_token
  FOR UPDATE OF game;

  IF NOT FOUND OR current_game_phase IS DISTINCT FROM 'waiting' THEN
    RETURN false;
  END IF;

  SELECT player.last_seen INTO target_last_seen
  FROM public.players AS player
  WHERE player.id = p_player_id AND player.game_id = target_game_id
  FOR UPDATE OF player;

  IF NOT FOUND OR target_last_seen > now() - interval '90 seconds' THEN
    RETURN false;
  END IF;

  DELETE FROM public.answers WHERE player_id = p_player_id;
  DELETE FROM public.players WHERE id = p_player_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_waiting_player(
  p_player_id uuid,
  p_session_token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_game_id uuid;
  current_game_phase text;
BEGIN
  SELECT player.game_id INTO target_game_id
  FROM public.players AS player
  WHERE player.id = p_player_id;

  IF NOT FOUND THEN RETURN false; END IF;

  SELECT game.phase INTO current_game_phase
  FROM public.games AS game
  WHERE game.id = target_game_id
  FOR UPDATE;

  IF NOT FOUND OR current_game_phase IS DISTINCT FROM 'waiting' THEN
    RETURN false;
  END IF;

  PERFORM 1
  FROM public.players AS player
  JOIN public.private_player_sessions AS session
    ON session.player_id = player.id
  WHERE player.id = p_player_id
    AND player.game_id = target_game_id
    AND session.session_token = p_session_token
  FOR UPDATE OF player;

  IF NOT FOUND THEN RETURN false; END IF;

  DELETE FROM public.answers WHERE player_id = p_player_id;
  DELETE FROM public.players WHERE id = p_player_id;
  RETURN FOUND;
END;
$$;

-- ============================================
-- RPC consolidada: get_game_state
-- ============================================
-- Retorna tudo que o GameStore.loadGameState() precisa numa só chamada:
--   { game, players, player, answers }
-- Reduz de 4 queries por tick de polling para 1.

CREATE OR REPLACE FUNCTION public.rpc_get_game_state(
  p_game_id uuid,
  p_player_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb;
  game_json jsonb;
  players_json jsonb;
  player_json jsonb;
  answers_json jsonb;
BEGIN
  SELECT to_jsonb(g) - 'admin_session_token'
  INTO game_json
  FROM public.games g
  WHERE g.id = p_game_id;

  IF game_json IS NULL THEN RETURN NULL; END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(p) - 'player_session_token' ORDER BY p.created_at ASC), '[]'::jsonb)
  INTO players_json
  FROM public.players p
  WHERE p.game_id = p_game_id;

  IF p_player_id IS NOT NULL THEN
    SELECT to_jsonb(p) - 'player_session_token'
    INTO player_json
    FROM public.players p
    WHERE p.id = p_player_id AND p.game_id = p_game_id;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.created_at ASC), '[]'::jsonb)
  INTO answers_json
  FROM public.answers a
  WHERE a.game_id = p_game_id;

  result := jsonb_build_object(
    'game', game_json,
    'players', players_json,
    'player', player_json,
    'answers', answers_json
  );

  RETURN result;
END;
$$;

-- ============================================
-- Trigger: impede join fora da sala de espera
-- ============================================

CREATE OR REPLACE FUNCTION public.require_waiting_game_for_player()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_game_phase text;
BEGIN
  SELECT phase INTO current_game_phase
  FROM public.games
  WHERE id = NEW.game_id
  FOR UPDATE;

  IF NOT FOUND OR current_game_phase IS DISTINCT FROM 'waiting' THEN
    RAISE EXCEPTION 'Game is not accepting players'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS players_require_waiting_game ON public.players;
CREATE TRIGGER players_require_waiting_game
  BEFORE INSERT ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.require_waiting_game_for_player();

-- ============================================
-- Permissões RPC para anon/authenticated
-- ============================================

GRANT EXECUTE ON FUNCTION public.rpc_create_game(text, text, text, integer[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_game_by_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_game_by_id(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_update_game(uuid, text, integer, boolean) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.rpc_create_player(uuid, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_player_by_id(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_player_by_id_and_game(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_players_by_game(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_update_player(uuid, integer, boolean, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_batch_update_players(jsonb) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.rpc_create_answer(uuid, uuid, integer, integer, boolean, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_answers_by_game(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_answers_by_game_and_question(uuid, integer) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.rpc_get_game_state(uuid, uuid) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_session_valid(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.player_heartbeat(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_offline_player(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leave_waiting_player(uuid, text) TO anon, authenticated;

-- ============================================
-- FIM
-- ============================================
