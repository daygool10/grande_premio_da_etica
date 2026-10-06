-- ============================================
-- RPC - Classificacao final
-- ============================================

-- Retorna a classificacao atual, que representa a classificacao final ao fim da corrida.
CREATE OR REPLACE FUNCTION public.rpc_get_classification(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  l_result jsonb;
BEGIN
  WITH first_answers AS (
    -- Uma resposta por dupla por pergunta: a PRIMEIRA, a mesma que o reveal usa.
    -- Sem isto uma resposta duplicada contaria duas vezes na soma de velocidade.
    SELECT DISTINCT ON (answer.player_id, answer.question_index)
      answer.player_id,
      answer.question_index,
      answer.is_correct,
      answer.created_at
    FROM public.answers AS answer
    WHERE answer.game_id = p_game_id
    ORDER BY answer.player_id, answer.question_index, answer.created_at ASC, answer.id ASC
  ), ranked_correct_answers AS (
    SELECT
      first_answer.player_id,
      (
        row_number() OVER (
          PARTITION BY first_answer.question_index
          ORDER BY first_answer.created_at ASC, first_answer.player_id ASC
        ) - 1
      )::integer AS speed_rank
    FROM first_answers AS first_answer
    WHERE first_answer.is_correct = true
  ), speed_totals AS (
    SELECT
      ranked.player_id,
      SUM(ranked.speed_rank)::integer AS speed_rank_sum
    FROM ranked_correct_answers AS ranked
    GROUP BY ranked.player_id
  ), ordered_players AS (
    SELECT
      player.id AS player_id,
      player.team_name,
      player.position,
      speed.speed_rank_sum,
      row_number() OVER (
        ORDER BY
          player.position DESC,
          speed.speed_rank_sum ASC NULLS LAST,
          player.created_at ASC,
          player.id ASC
      )::integer AS player_rank
    FROM public.players AS player
    LEFT JOIN speed_totals AS speed ON speed.player_id = player.id
    WHERE player.game_id = p_game_id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'rank', ordered.player_rank,
        'player_id', ordered.player_id,
        'team_name', ordered.team_name,
        'position', ordered.position,
        'speed_rank_sum', ordered.speed_rank_sum
      ) ORDER BY ordered.player_rank ASC
    ),
    '[]'::jsonb
  )
  INTO l_result
  FROM ordered_players AS ordered;

  RETURN l_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_classification(uuid) TO anon, authenticated;

-- ============================================================
-- Permissoes
-- No Postgres toda funcao nasce executavel por PUBLIC ("=X/postgres" na ACL), entao um GRANT
-- explicito NAO restringe nada. Revogamos de PUBLIC e concedemos so a quem chama de verdade.
-- Nao use DO/EXCEPTION aqui: se uma funcao abaixo nao existir, o erro e o sinal de que o
-- supabase/init.sql (que as cria) nao foi aplicado antes.
-- ============================================================
-- Funcao desta migracao:
REVOKE ALL ON FUNCTION public.rpc_get_classification(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_classification(uuid) TO anon, authenticated;
