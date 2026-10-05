-- ============================================
-- Etica F1 - Schema para Supabase
-- Rodar no SQL Editor do Supabase (New query -> RUN)
-- ============================================

-- ============================================
-- Tabelas
-- ============================================

-- Tabela de partidas
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

-- Tabela de jogadores
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

-- Tabela de respostas
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

-- Limpeza idempotente
ALTER TABLE public.players DROP COLUMN IF EXISTS skipped_turn;

-- ============================================
-- Tabelas privadas de sessões
-- ============================================

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
-- Todas as tabelas ficam com RLS LIGADO e SEM policies.
-- Isso bloqueia completamente o acesso via PostgREST (anon/authenticated key).
-- Todo acesso passa a ser OBRIGATORIAMENTE via funções RPC SECURITY DEFINER abaixo.

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_game_admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_player_sessions ENABLE ROW LEVEL SECURITY;

-- Bloqueia acesso direto via PostgREST para todos os roles do Supabase
REVOKE ALL ON public.games FROM anon, authenticated;
REVOKE ALL ON public.players FROM anon, authenticated;
REVOKE ALL ON public.answers FROM anon, authenticated;
REVOKE ALL ON public.private_game_admin_sessions FROM anon, authenticated;
REVOKE ALL ON public.private_player_sessions FROM anon, authenticated;

-- ============================================
-- Índices
-- ============================================

-- Índice único por partida e equipe F1
CREATE UNIQUE INDEX IF NOT EXISTS players_game_id_f1_team_unique
  ON public.players (game_id, f1_team);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_players_game_id ON public.players (game_id);
CREATE INDEX IF NOT EXISTS idx_answers_game_id ON public.answers (game_id);
CREATE INDEX IF NOT EXISTS idx_answers_player_id ON public.answers (player_id);
CREATE INDEX IF NOT EXISTS idx_answers_game_question ON public.answers (game_id, question_index);
CREATE INDEX IF NOT EXISTS idx_games_game_code ON public.games (game_code);

-- ============================================
-- Funções de sessão (triggers)
-- ============================================

-- Captura token de sessão do admin após insert
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

-- Captura token de sessão do jogador após insert
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

-- Triggers de captura de tokens
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
-- Funções de presença e recuperação (RPC)
-- ============================================

-- Heartbeat do jogador
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

-- Remove jogador offline (pelo admin)
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
  SELECT player.game_id
  INTO target_game_id
  FROM public.players AS player
  WHERE player.id = p_player_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT game.phase
  INTO current_game_phase
  FROM public.games AS game
  JOIN public.private_game_admin_sessions AS session
    ON session.game_id = game.id
  WHERE game.id = target_game_id
    AND session.session_token = p_admin_token
  FOR UPDATE OF game;

  IF NOT FOUND OR current_game_phase IS DISTINCT FROM 'waiting' THEN
    RETURN false;
  END IF;

  SELECT player.last_seen
  INTO target_last_seen
  FROM public.players AS player
  WHERE player.id = p_player_id
    AND player.game_id = target_game_id
  FOR UPDATE OF player;

  IF NOT FOUND OR target_last_seen > now() - interval '90 seconds' THEN
    RETURN false;
  END IF;

  DELETE FROM public.answers WHERE player_id = p_player_id;
  DELETE FROM public.players WHERE id = p_player_id;
  RETURN FOUND;
END;
$$;

-- Jogador sai da sala de espera
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
  SELECT player.game_id
  INTO target_game_id
  FROM public.players AS player
  WHERE player.id = p_player_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT game.phase
  INTO current_game_phase
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

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  DELETE FROM public.answers WHERE player_id = p_player_id;
  DELETE FROM public.players WHERE id = p_player_id;
  RETURN FOUND;
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
  SELECT phase
  INTO current_game_phase
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
-- Permissões RPC para o frontend (anon key)
-- ============================================
-- As funções abaixo são chamadas pelo cliente via supabase.rpc(...).
-- Elas mesmas validam o token de sessão internamente, por isso
-- podem ser executadas pelo role 'anon' com segurança.

GRANT EXECUTE ON FUNCTION public.player_heartbeat(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_offline_player(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leave_waiting_player(uuid, text) TO anon, authenticated;

-- ============================================
-- FIM
-- ============================================
