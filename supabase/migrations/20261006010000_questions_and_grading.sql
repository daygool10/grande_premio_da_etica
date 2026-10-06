-- ============================================
-- Tabelas de perguntas e opções
-- ============================================

CREATE TABLE IF NOT EXISTS public.questions (
  id integer PRIMARY KEY,
  title text NOT NULL,
  scenario text NOT NULL,
  position integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS questions_position_unique
  ON public.questions (position);

CREATE TABLE IF NOT EXISTS public.question_options (
  question_id integer NOT NULL REFERENCES public.questions (id) ON DELETE CASCADE,
  option_index integer NOT NULL,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  PRIMARY KEY (question_id, option_index)
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Relógio controlado pelo servidor
-- ============================================

ALTER TABLE public.games ADD COLUMN IF NOT EXISTS question_shown_at timestamptz;

-- Atualiza campos permitidos da partida. Campos NULL são ignorados.
-- EXIGE o token do admin: sem essa checagem qualquer pessoa com a chave anon (que é publica e
-- vai no bundle) revelava uma pergunta por aqui e em seguida lia o gabarito em
-- rpc_get_answer_key, que so olha a flag question_revealed. A assinatura antiga e removida
-- de proposito, para nao sobrar uma sobrecarga sem checagem.
DROP FUNCTION IF EXISTS public.rpc_update_game(uuid, text, integer, boolean);

CREATE OR REPLACE FUNCTION public.rpc_update_game(
  p_game_id uuid,
  p_admin_session_token text,
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
  IF NOT public.admin_session_valid(p_game_id, p_admin_session_token) THEN
    RAISE EXCEPTION 'Invalid or missing admin session token';
  END IF;

  UPDATE public.games
  SET
    phase = COALESCE(p_phase, phase),
    current_question_index = COALESCE(p_current_question_index, current_question_index),
    question_revealed = COALESCE(p_question_revealed, question_revealed),
    question_shown_at = CASE
      WHEN (p_current_question_index IS NOT NULL
        AND p_current_question_index IS DISTINCT FROM current_question_index)
        OR (p_phase = 'question' AND phase IS DISTINCT FROM 'question')
      THEN now()
      ELSE question_shown_at
    END
  WHERE id = p_game_id
  RETURNING * INTO updated_game;

  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN to_jsonb(updated_game) - 'admin_session_token';
END;
$$;

-- Retorna as perguntas da partida sem expor o gabarito.
CREATE OR REPLACE FUNCTION public.rpc_get_dealt_questions(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  found_game public.games;
  result jsonb;
BEGIN
  SELECT * INTO found_game
  FROM public.games
  WHERE id = p_game_id;

  IF NOT FOUND OR found_game.question_order IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'title', q.title,
      'scenario', q.scenario,
      'options', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'option_index', qo.option_index,
            'text', qo.option_text
          ) ORDER BY qo.option_index
        ), '[]'::jsonb)
        FROM public.question_options qo
        WHERE qo.question_id = q.id
      )
    ) ORDER BY dealt.ordinality
  ), '[]'::jsonb)
  INTO result
  FROM unnest(found_game.question_order) WITH ORDINALITY AS dealt(question_id, ordinality)
  JOIN public.questions q ON q.id = dealt.question_id;

  RETURN result;
END;
$$;

-- Cria uma resposta e calcula o resultado exclusivamente no servidor.
DROP FUNCTION IF EXISTS public.rpc_create_answer(uuid, uuid, integer, integer, boolean, integer);

CREATE OR REPLACE FUNCTION public.rpc_create_answer(
  p_game_id uuid,
  p_player_id uuid,
  p_question_index integer,
  p_selected_option integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  found_game public.games;
  new_answer public.answers;
  -- Prefixo l_ de proposito: um nome igual ao de uma coluna (question_id,
  -- response_time_ms) fica ambiguo dentro do PL/pgSQL e falha com 42702
  -- "column reference is ambiguous".
  l_question_id integer;
  l_correct_option integer;
  l_answer_is_correct boolean;
  l_response_time_ms integer;
BEGIN
  SELECT * INTO found_game
  FROM public.games
  WHERE id = p_game_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  -- A dupla tem de ser desta partida. Sem isto da para gravar resposta no lugar da dupla de
  -- outra partida, e o indice unico (migracao 05) passa a devolver 409 para a dupla de verdade.
  IF NOT EXISTS (
    SELECT 1 FROM public.players AS player
    WHERE player.id = p_player_id AND player.game_id = p_game_id
  ) THEN
    RAISE EXCEPTION 'Player does not belong to this game';
  END IF;

  -- So aceita resposta durante a pergunta e antes da revelacao: depois do reveal ela entraria
  -- na classificacao, que e calculada a partir das respostas.
  IF found_game.phase IS DISTINCT FROM 'question' THEN
    RAISE EXCEPTION 'Game is not taking answers (phase %)', found_game.phase;
  END IF;

  IF found_game.question_revealed THEN
    RAISE EXCEPTION 'Question already revealed';
  END IF;

  l_question_id := found_game.question_order[p_question_index + 1];
  IF l_question_id IS NULL THEN
    RAISE EXCEPTION 'Question not found for index %', p_question_index;
  END IF;

  SELECT qo.option_index INTO l_correct_option
  FROM public.question_options qo
  WHERE qo.question_id = l_question_id AND qo.is_correct = true;

  IF l_correct_option IS NULL THEN
    RAISE EXCEPTION 'No answer key for question %', l_question_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.question_options AS option
    WHERE option.question_id = l_question_id AND option.option_index = p_selected_option
  ) THEN
    RAISE EXCEPTION 'Option % does not exist for question %', p_selected_option, l_question_id;
  END IF;

  l_answer_is_correct := p_selected_option = l_correct_option;
  l_response_time_ms := CASE
    WHEN found_game.question_shown_at IS NULL THEN NULL
    ELSE GREATEST(0, ROUND(EXTRACT(EPOCH FROM (now() - found_game.question_shown_at)) * 1000))::integer
  END;

  INSERT INTO public.answers (
    game_id, player_id, question_index, selected_option, is_correct, response_time_ms
  )
  VALUES (
    p_game_id, p_player_id, p_question_index, p_selected_option,
    l_answer_is_correct, l_response_time_ms
  )
  RETURNING * INTO new_answer;

  RETURN to_jsonb(new_answer) - 'is_correct';
END;
$$;

-- Permissões RPC para anon/authenticated
GRANT EXECUTE ON FUNCTION public.rpc_get_dealt_questions(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_create_answer(uuid, uuid, integer, integer) TO anon, authenticated;

-- ============================================================
-- Permissoes
-- No Postgres toda funcao nasce executavel por PUBLIC ("=X/postgres" na ACL), entao um GRANT
-- explicito NAO restringe nada. Revogamos de PUBLIC e concedemos so a quem chama de verdade.
-- Nao use DO/EXCEPTION aqui: se uma funcao abaixo nao existir, o erro e o sinal de que o
-- supabase/init.sql (que as cria) nao foi aplicado antes.
-- ============================================================
-- As tres funcoes que este arquivo define:
REVOKE ALL ON FUNCTION public.rpc_update_game(uuid, text, text, integer, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_update_game(uuid, text, text, integer, boolean) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_get_dealt_questions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_dealt_questions(uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_create_answer(uuid, uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_create_answer(uuid, uuid, integer, integer) TO anon, authenticated;

-- ============================================================
-- Permissoes
-- No Postgres toda funcao nasce executavel por PUBLIC ("=X/postgres" na ACL), entao um GRANT
-- explicito NAO restringe nada. Revogamos de PUBLIC e concedemos so a quem chama de verdade.
-- Nao use DO/EXCEPTION aqui: se uma funcao abaixo nao existir, o erro e o sinal de que o
-- supabase/init.sql (que as cria) nao foi aplicado antes.
-- ============================================================
-- As que ja existiam no init.sql e o cliente novo ainda usa:
REVOKE ALL ON FUNCTION public.admin_session_valid(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_session_valid(uuid, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.leave_waiting_player(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_waiting_player(uuid, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.player_heartbeat(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_heartbeat(uuid, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.remove_offline_player(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_offline_player(uuid, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_create_game(text, text, text, integer[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_create_game(text, text, text, integer[]) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_create_player(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_create_player(uuid, text, text, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_get_answers_by_game(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_answers_by_game(uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_get_answers_by_game_and_question(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_answers_by_game_and_question(uuid, integer) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_get_game_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_game_by_code(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_get_game_by_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_game_by_id(uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_get_game_state(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_game_state(uuid, uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_get_player_by_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_player_by_id(uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_get_player_by_id_and_game(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_player_by_id_and_game(uuid, uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_get_players_by_game(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_players_by_game(uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.capture_admin_session_token() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.capture_player_session_token() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.require_waiting_game_for_player() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- Permissoes
-- No Postgres toda funcao nasce executavel por PUBLIC ("=X/postgres" na ACL), entao um GRANT
-- explicito NAO restringe nada. Revogamos de PUBLIC e concedemos so a quem chama de verdade.
-- Nao use DO/EXCEPTION aqui: se uma funcao abaixo nao existir, o erro e o sinal de que o
-- supabase/init.sql (que as cria) nao foi aplicado antes.
-- ============================================================
-- Estas duas escreviam sem checar nada e o cliente novo NAO chama nenhuma delas (a posicao agora
-- vem do rpc_reveal). Perdem o EXECUTE de PUBLIC, anon e authenticated: antes, qualquer um com a
-- chave publica podia mudar a posicao de qualquer dupla ou reescrever o placar inteiro.
-- service_role mantem, para ferramenta de admin que venha a existir.
REVOKE ALL ON FUNCTION public.rpc_update_player(uuid, integer, boolean, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_batch_update_players(jsonb) FROM PUBLIC, anon, authenticated;
