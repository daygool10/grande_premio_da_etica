-- ============================================
-- W6(b) - o host escolhe o comprimento da corrida
-- ============================================

-- Devolve apenas os ids do banco: nada de texto, nada de gabarito.
CREATE OR REPLACE FUNCTION public.rpc_list_question_ids()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(jsonb_agg(question.id ORDER BY question.position), '[]'::jsonb)
  FROM public.questions AS question;
$$;

-- Mesma RPC de antes, agora validando a ordem que o host mandou.
CREATE OR REPLACE FUNCTION public.rpc_create_game(
  p_game_code text,
  p_admin_id text,
  p_admin_session_token text,
  p_question_order integer[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  l_new_game public.games;
  l_question_order integer[];
  l_unknown integer;
  l_distinct integer;
BEGIN
  IF p_question_order IS NOT NULL AND cardinality(p_question_order) > 0 THEN
    SELECT count(*) INTO l_unknown
    FROM unnest(p_question_order) AS requested(id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.questions AS question WHERE question.id = requested.id
    );

    IF l_unknown > 0 THEN
      RAISE EXCEPTION 'Question order names % unknown question(s)', l_unknown;
    END IF;

    SELECT count(DISTINCT requested.id) INTO l_distinct
    FROM unnest(p_question_order) AS requested(id);

    IF l_distinct <> cardinality(p_question_order) THEN
      RAISE EXCEPTION 'Question order repeats questions';
    END IF;

    l_question_order := p_question_order;
  ELSE
    SELECT array_agg(question.id ORDER BY random())
    INTO l_question_order
    FROM public.questions AS question;

    IF l_question_order IS NULL THEN
      RAISE EXCEPTION 'Question bank is empty';
    END IF;
  END IF;

  INSERT INTO public.games (
    game_code, admin_id, admin_session_token,
    phase, current_question_index, question_order, question_revealed
  )
  VALUES (
    p_game_code, p_admin_id, p_admin_session_token,
    'waiting', 0, l_question_order, false
  )
  RETURNING * INTO l_new_game;

  RETURN to_jsonb(l_new_game) - 'admin_session_token';
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_list_question_ids() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_create_game(text, text, text, integer[]) TO anon, authenticated;

-- ============================================================
-- Permissoes
-- No Postgres toda funcao nasce executavel por PUBLIC ("=X/postgres" na ACL), entao um GRANT
-- explicito NAO restringe nada. Revogamos de PUBLIC e concedemos so a quem chama de verdade.
-- Nao use DO/EXCEPTION aqui: se uma funcao abaixo nao existir, o erro e o sinal de que o
-- supabase/init.sql (que as cria) nao foi aplicado antes.
-- ============================================================
-- Funcoes desta migracao:
REVOKE ALL ON FUNCTION public.rpc_list_question_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_list_question_ids() TO anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_create_game(text, text, text, integer[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_create_game(text, text, text, integer[]) TO anon, authenticated;
