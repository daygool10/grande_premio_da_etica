-- ============================================
-- Migração 0001: unicidade de respostas
-- Impede o mesmo jogador de responder a mesma
-- questão mais de uma vez na mesma partida.
-- ============================================

DO $$
DECLARE
  duplicate_groups integer;
  duplicate_rows integer;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(cnt), 0)
  INTO duplicate_groups, duplicate_rows
  FROM (
    SELECT COUNT(*) AS cnt
    FROM public.answers
    GROUP BY game_id, player_id, question_index
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_groups > 0 THEN
    RAISE EXCEPTION
      'answers has % duplicate row(s) in % group(s) of (game_id, player_id, question_index); remove duplicates before applying this migration, it never deletes data.',
      duplicate_rows, duplicate_groups;
  END IF;

  CREATE UNIQUE INDEX IF NOT EXISTS answers_game_id_player_id_question_unique
    ON public.answers (game_id, player_id, question_index);
END
$$;