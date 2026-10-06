-- ============================================
-- Integridade: uma resposta por dupla por pergunta
-- A linha do Supabase nao tinha esta restricao; sem ela uma resposta duplicada
-- entra duas vezes na classificacao (a soma de velocidade conta as duas).
-- Pre-checado na base real antes de escrever: 111 respostas, zero duplicadas,
-- entao a criacao do indice passa.
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS answers_game_player_question_unique
  ON public.answers (game_id, player_id, question_index);
