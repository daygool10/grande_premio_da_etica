-- ============================================
-- W6(a) - autoria de perguntas pelo host
-- ============================================

-- O banco passa a gerar ids proprios: as 35 perguntas do seed vieram com ids explicitos.
CREATE SEQUENCE IF NOT EXISTS public.questions_id_seq;

SELECT setval(
  'public.questions_id_seq',
  COALESCE((SELECT MAX(question.id) FROM public.questions AS question), 0) + 1,
  false
);

ALTER SEQUENCE public.questions_id_seq OWNED BY public.questions.id;
ALTER TABLE public.questions ALTER COLUMN id SET DEFAULT nextval('public.questions_id_seq');

-- ------------------------------------------------------------
-- Lista o banco inteiro, com o gabarito, para quem tem o token de admin da partida.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_author_list_questions(
  p_game_id uuid,
  p_admin_session_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  l_result jsonb;
BEGIN
  IF NOT public.admin_session_valid(p_game_id, p_admin_session_token) THEN
    RAISE EXCEPTION 'Invalid or missing admin session token';
  END IF;

  SELECT COALESCE(jsonb_agg(question_json ORDER BY question_position), '[]'::jsonb)
  INTO l_result
  FROM (
    SELECT
      question.position AS question_position,
      jsonb_build_object(
        'id', question.id,
        'title', question.title,
        'scenario', question.scenario,
        'position', question.position,
        'options', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'option_index', option.option_index,
              'option_text', option.option_text,
              'is_correct', option.is_correct
            ) ORDER BY option.option_index
          )
          FROM public.question_options AS option
          WHERE option.question_id = question.id
        ), '[]'::jsonb)
      ) AS question_json
    FROM public.questions AS question
  ) AS questions_json;

  RETURN l_result;
END;
$$;

-- ------------------------------------------------------------
-- Cria (p_question_id NULL) ou edita uma pergunta e as suas opcoes.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_author_save_question(
  p_game_id uuid,
  p_admin_session_token text,
  p_question_id integer,
  p_title text,
  p_scenario text,
  p_options jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  l_title text := btrim(COALESCE(p_title, ''));
  l_scenario text := btrim(COALESCE(p_scenario, ''));
  l_option_count integer := COALESCE(jsonb_array_length(p_options), 0);
  l_correct_count integer;
  l_blank_count integer;
  l_question_id integer := p_question_id;
  l_position integer;
  l_live_games integer;
BEGIN
  IF NOT public.admin_session_valid(p_game_id, p_admin_session_token) THEN
    RAISE EXCEPTION 'Invalid or missing admin session token';
  END IF;

  IF l_title = '' THEN
    RAISE EXCEPTION 'Question title must not be empty';
  END IF;

  IF l_scenario = '' THEN
    RAISE EXCEPTION 'Question scenario must not be empty';
  END IF;

  IF l_option_count < 2 THEN
    RAISE EXCEPTION 'A question needs at least two options (got %)', l_option_count;
  END IF;

  IF l_option_count > 6 THEN
    RAISE EXCEPTION 'A question takes at most six options (got %)', l_option_count;
  END IF;

  SELECT count(*) INTO l_correct_count
  FROM jsonb_array_elements(p_options) AS option
  WHERE COALESCE((option ->> 'is_correct')::boolean, false);

  IF l_correct_count <> 1 THEN
    RAISE EXCEPTION 'A question must have exactly one correct option (got %)', l_correct_count;
  END IF;

  SELECT count(*) INTO l_blank_count
  FROM jsonb_array_elements(p_options) AS option
  WHERE btrim(COALESCE(option ->> 'option_text', '')) = '';

  IF l_blank_count > 0 THEN
    RAISE EXCEPTION 'Every option needs text (% blank)', l_blank_count;
  END IF;

  -- Uma corrida em andamento nao muda debaixo dos jogadores.
  IF l_question_id IS NOT NULL THEN
    SELECT count(*) INTO l_live_games
    FROM public.games AS game
    WHERE game.phase = 'question'
      AND l_question_id = ANY (game.question_order);

    IF l_live_games > 0 THEN
      RAISE EXCEPTION 'Question % belongs to a race in progress', l_question_id;
    END IF;
  END IF;

  IF l_question_id IS NULL THEN
    SELECT COALESCE(MAX(question.position), 0) + 1
    INTO l_position
    FROM public.questions AS question;

    INSERT INTO public.questions (title, scenario, position)
    VALUES (l_title, l_scenario, l_position)
    RETURNING id INTO l_question_id;
  ELSE
    UPDATE public.questions AS question
    SET title = l_title, scenario = l_scenario
    WHERE question.id = l_question_id
    RETURNING position INTO l_position;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Question % does not exist', l_question_id;
    END IF;
  END IF;

  DELETE FROM public.question_options AS option WHERE option.question_id = l_question_id;

  INSERT INTO public.question_options (question_id, option_index, option_text, is_correct)
  SELECT
    l_question_id,
    (choice.ordinality - 1)::integer,
    btrim(choice.value ->> 'option_text'),
    COALESCE((choice.value ->> 'is_correct')::boolean, false)
  FROM jsonb_array_elements(p_options) WITH ORDINALITY AS choice(value, ordinality);

  RETURN jsonb_build_object('id', l_question_id, 'position', l_position);
END;
$$;

-- ------------------------------------------------------------
-- Apaga uma pergunta (as opcoes caem por ON DELETE CASCADE).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_author_delete_question(
  p_game_id uuid,
  p_admin_session_token text,
  p_question_id integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  l_remaining integer;
  l_live_games integer;
BEGIN
  IF NOT public.admin_session_valid(p_game_id, p_admin_session_token) THEN
    RAISE EXCEPTION 'Invalid or missing admin session token';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.questions AS question WHERE question.id = p_question_id) THEN
    RAISE EXCEPTION 'Question % does not exist', p_question_id;
  END IF;

  SELECT count(*) INTO l_remaining FROM public.questions AS question;

  IF l_remaining <= 1 THEN
    RAISE EXCEPTION 'The bank must keep at least one question';
  END IF;

  SELECT count(*) INTO l_live_games
  FROM public.games AS game
  WHERE game.phase = 'question'
    AND p_question_id = ANY (game.question_order);

  IF l_live_games > 0 THEN
    RAISE EXCEPTION 'Question % belongs to a race in progress', p_question_id;
  END IF;

  DELETE FROM public.questions AS question WHERE question.id = p_question_id;

  RETURN jsonb_build_object('deleted', true, 'id', p_question_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_author_list_questions(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_author_save_question(uuid, text, integer, text, text, jsonb)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_author_delete_question(uuid, text, integer) TO anon, authenticated;
