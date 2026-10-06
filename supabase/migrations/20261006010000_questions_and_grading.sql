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
