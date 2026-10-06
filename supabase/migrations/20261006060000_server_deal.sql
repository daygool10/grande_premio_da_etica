-- Escolhe as perguntas da partida no servidor.
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
BEGIN
  IF p_question_order IS NOT NULL AND cardinality(p_question_order) > 0 THEN
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

-- ============================================================
-- Permissoes
-- No Postgres toda funcao nasce executavel por PUBLIC ("=X/postgres" na ACL), entao um GRANT
-- explicito NAO restringe nada. Revogamos de PUBLIC e concedemos so a quem chama de verdade.
-- Nao use DO/EXCEPTION aqui: se uma funcao abaixo nao existir, o erro e o sinal de que o
-- supabase/init.sql (que as cria) nao foi aplicado antes.
-- ============================================================
-- Funcao desta migracao:
REVOKE ALL ON FUNCTION public.rpc_create_game(text, text, text, integer[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_create_game(text, text, text, integer[]) TO anon, authenticated;
