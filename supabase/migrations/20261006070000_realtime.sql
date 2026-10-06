-- ============================================
-- Realtime: o estado ao vivo chega por websocket, nao por polling
-- As tres tabelas de jogo entram na publicacao supabase_realtime para que o
-- cliente receba as mudancas com postgres_changes.
--
-- IMPORTANTE (e o motivo das policies serem condicionais): o Realtime respeita a
-- RLS. Hoje as cinco tabelas tem RLS ligada e ZERO policies, ou seja o anon nao
-- le nada direto e tudo passa pelas RPCs SECURITY DEFINER. Publicar sem policy
-- nao entregaria evento nenhum; publicar com policy permissiva em answers
-- entregaria o gabarito (is_correct) ANTES do reveal e destruiria a protecao da
-- rpc_reveal. Por isso answers so e legivel quando a pergunta ja foi revelada.
-- ============================================

-- Entra na publicacao apenas se ainda nao estiver (replay-safe).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'games') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'players') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'answers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.answers;
  END IF;
END;
$$;

-- GRANT SELECT nao basta sozinho: sem policy a RLS continua negando.
GRANT SELECT ON public.games TO anon, authenticated;
GRANT SELECT ON public.players TO anon, authenticated;
GRANT SELECT ON public.answers TO anon, authenticated;

-- Partida e jogadores: sao o estado publico da sala (fase, pergunta vigente,
-- nomes das duplas e posicoes). Nenhum segredo: o token do admin mora em
-- private_game_admin_sessions e o do jogador em private_player_sessions, que
-- NAO entram na publicacao.
DROP POLICY IF EXISTS games_select_public ON public.games;
CREATE POLICY games_select_public ON public.games
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS players_select_public ON public.players;
CREATE POLICY players_select_public ON public.players
  FOR SELECT TO anon, authenticated USING (true);

-- Respostas: legiveis SOMENTE depois do reveal. Antes disso uma leitura direta
-- entregaria is_correct, e qualquer jogador deduziria a alternativa correta.
DROP POLICY IF EXISTS answers_select_after_reveal ON public.answers;
CREATE POLICY answers_select_after_reveal ON public.answers
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.games AS game
    WHERE game.id = answers.game_id AND game.question_revealed
  ));
