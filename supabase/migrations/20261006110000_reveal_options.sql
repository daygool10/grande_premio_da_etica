-- ============================================================
-- Opcao A: o jogador enxerga a opcao correta DEPOIS da revelacao
-- ============================================================
-- O defeito: a tela do jogador (components/player_playing.tsx:254) pintava a opcao
-- correta de verde comparando com `answerKey`, e o answerKey so e preenchido no
-- caminho do admin (store/GameStore.ts:649, depois de getAnswerKey, que exige o
-- token do admin). No aparelho do jogador ele e sempre nulo: nada ficava verde, o
-- X caia sobre a opcao escolhida e a linha 257 a pintava de vermelho, mesmo com a
-- resposta certa.
--
-- Aqui o proprio payload das perguntas passa a carregar `is_correct` por opcao,
-- SOMENTE para a pergunta que esta sendo revelada e SOMENTE depois da revelacao.
-- Antes disso a chave nao existe no JSON, entao nao ha gabarito a extrair; e as
-- outras 34 perguntas da corrida continuam sem veredito nenhum no payload.
-- O tabuleiro do admin nao muda: ele continua usando o answerKey dele.

CREATE OR REPLACE FUNCTION public.rpc_get_dealt_questions(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  found_game public.games;
  l_reveal_ordinal integer;
  result jsonb;
BEGIN
  SELECT * INTO found_game
  FROM public.games
  WHERE id = p_game_id;

  IF NOT FOUND OR found_game.question_order IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  -- ordinality e 1-based e current_question_index e 0-based.
  -- Fica NULL quando nao ha revelacao em curso: nenhuma opcao carrega is_correct.
  l_reveal_ordinal := CASE
    WHEN found_game.question_revealed THEN found_game.current_question_index + 1
    ELSE NULL
  END;

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
          ) || CASE
            WHEN dealt.ordinality = l_reveal_ordinal
            THEN jsonb_build_object('is_correct', qo.is_correct)
            ELSE '{}'::jsonb
          END
          ORDER BY qo.option_index
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

-- A funcao ja existia e o CREATE OR REPLACE preserva a ACL, mas deixamos explicito
-- para o arquivo ficar auto-suficiente (anon precisa chamar: e o cliente do jogador).
REVOKE ALL ON FUNCTION public.rpc_get_dealt_questions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_dealt_questions(uuid) TO anon, authenticated;
