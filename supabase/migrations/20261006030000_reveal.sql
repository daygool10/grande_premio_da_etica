-- ============================================
-- RPCs - Reveal
-- ============================================

-- Revela a pergunta, calcula os avanços e atualiza todos os players atomicamente.
CREATE OR REPLACE FUNCTION public.rpc_reveal(
  p_game_id uuid,
  p_admin_session_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  l_game public.games;
  l_player public.players;
  l_answer public.answers;
  l_question_index integer;
  l_rank integer;
  l_advance integer;
  l_new_position integer;
  l_is_correct boolean;
  l_response_time_ms integer;
  l_deltas jsonb := '[]'::jsonb;
BEGIN
  SELECT game.* INTO l_game
  FROM public.games AS game
  WHERE game.id = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.private_game_admin_sessions AS session
    WHERE session.game_id = p_game_id
      AND session.session_token = p_admin_session_token
  ) THEN
    RAISE EXCEPTION 'Invalid or missing admin session token';
  END IF;

  IF l_game.question_revealed THEN
    RETURN jsonb_build_object(
      'status', 'already_revealed',
      'revealed', true,
      'deltas', '[]'::jsonb
    );
  END IF;

  l_question_index := l_game.current_question_index;

  FOR l_player IN
    SELECT player.*
    FROM public.players AS player
    WHERE player.game_id = p_game_id
    ORDER BY player.id
  LOOP
    l_rank := NULL;
    l_is_correct := false;
    l_response_time_ms := NULL;

    SELECT answer.* INTO l_answer
    FROM public.answers AS answer
    WHERE answer.game_id = p_game_id
      AND answer.question_index = l_question_index
      AND answer.player_id = l_player.id
    ORDER BY answer.created_at ASC, answer.id ASC
    LIMIT 1;

    IF FOUND THEN
      l_is_correct := l_answer.is_correct;
      l_response_time_ms := l_answer.response_time_ms;

      IF l_is_correct THEN
        SELECT ranked.answer_rank INTO l_rank
        FROM (
          SELECT answer_ranked.player_id,
                 row_number() OVER (
                   ORDER BY answer_ranked.created_at ASC, answer_ranked.player_id ASC
                 ) - 1 AS answer_rank
          FROM public.answers AS answer_ranked
          WHERE answer_ranked.game_id = p_game_id
            AND answer_ranked.question_index = l_question_index
            AND answer_ranked.is_correct = true
        ) AS ranked
        WHERE ranked.player_id = l_player.id;
      END IF;
    END IF;

    l_advance := CASE
      WHEN l_is_correct THEN GREATEST(1, 4 - l_rank)
      ELSE 0
    END;

    l_new_position := l_player.position + l_advance;

    UPDATE public.players AS player
    SET position = l_new_position
    WHERE player.id = l_player.id;

    l_deltas := l_deltas || jsonb_build_array(jsonb_build_object(
      'player_id', l_player.id,
      'team_name', l_player.team_name,
      'position', l_new_position,
      'advance', l_advance,
      'is_correct', l_is_correct,
      'response_time_ms', l_response_time_ms
    ));
  END LOOP;

  UPDATE public.games AS game
  SET question_revealed = true
  WHERE game.id = p_game_id;

  RETURN jsonb_build_object(
    'status', 'revealed',
    'revealed', true,
    'question_index', l_question_index,
    'deltas', l_deltas
  );
END;
$$;

-- Libera o gabarito somente depois da revelacao, E somente para o admin da partida: olhar so
-- a flag question_revealed permitia forcar a revelacao por rpc_update_game e ler a chave.
-- A assinatura antiga e removida de proposito.
DROP FUNCTION IF EXISTS public.rpc_get_answer_key(uuid, integer);

CREATE OR REPLACE FUNCTION public.rpc_get_answer_key(
  p_game_id uuid,
  p_admin_session_token text,
  p_question_index integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  l_game public.games;
  l_question_id integer;
  l_option_index integer;
BEGIN
  SELECT game.* INTO l_game
  FROM public.games AS game
  WHERE game.id = p_game_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  IF NOT public.admin_session_valid(p_game_id, p_admin_session_token) THEN
    RAISE EXCEPTION 'Invalid or missing admin session token';
  END IF;

  IF NOT l_game.question_revealed THEN
    RAISE EXCEPTION 'Answer key is only available after the reveal';
  END IF;

  l_question_id := l_game.question_order[p_question_index + 1];

  SELECT option_row.option_index INTO l_option_index
  FROM public.question_options AS option_row
  WHERE option_row.question_id = l_question_id
    AND option_row.is_correct = true;

  RETURN jsonb_build_object('option_index', l_option_index);
END;
$$;

-- Oculta o gabarito nas respostas enquanto a pergunta nao foi revelada.
CREATE OR REPLACE FUNCTION public.rpc_get_answers_by_game(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  l_question_revealed boolean := false;
  l_result jsonb;
BEGIN
  SELECT game.question_revealed INTO l_question_revealed
  FROM public.games AS game
  WHERE game.id = p_game_id;

  SELECT COALESCE(jsonb_agg(
    to_jsonb(answer) || jsonb_build_object(
      'is_correct', CASE
        WHEN l_question_revealed THEN answer.is_correct
        ELSE NULL::boolean
      END
    ) ORDER BY answer.created_at ASC
  ), '[]'::jsonb)
  INTO l_result
  FROM public.answers AS answer
  WHERE answer.game_id = p_game_id;

  RETURN l_result;
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
  l_question_revealed boolean := false;
  l_result jsonb;
BEGIN
  SELECT game.question_revealed INTO l_question_revealed
  FROM public.games AS game
  WHERE game.id = p_game_id;

  SELECT COALESCE(jsonb_agg(
    to_jsonb(answer) || jsonb_build_object(
      'is_correct', CASE
        WHEN l_question_revealed THEN answer.is_correct
        ELSE NULL::boolean
      END
    )
  ), '[]'::jsonb)
  INTO l_result
  FROM public.answers AS answer
  WHERE answer.game_id = p_game_id AND answer.question_index = p_question_index;

  RETURN l_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_reveal(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_answer_key(uuid, text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_answers_by_game(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_answers_by_game_and_question(uuid, integer) TO anon, authenticated;

-- ============================================================
-- Permissoes
-- No Postgres toda funcao nasce executavel por PUBLIC ("=X/postgres" na ACL), entao um GRANT
-- explicito NAO restringe nada. Revogamos de PUBLIC e concedemos so a quem chama de verdade.
-- Nao use DO/EXCEPTION aqui: se uma funcao abaixo nao existir, o erro e o sinal de que o
-- supabase/init.sql (que as cria) nao foi aplicado antes.
-- ============================================================
-- Funcoes desta migracao:
REVOKE ALL ON FUNCTION public.rpc_reveal(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_reveal(uuid, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_get_answer_key(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_answer_key(uuid, text, integer) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_get_answers_by_game(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_answers_by_game(uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_get_answers_by_game_and_question(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_answers_by_game_and_question(uuid, integer) TO anon, authenticated;
