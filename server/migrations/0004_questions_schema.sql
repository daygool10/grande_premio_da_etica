-- ============================================
-- Migração 0004: perguntas e opções de resposta
-- As 35 perguntas saem do bundle do cliente e passam
-- a morar no banco em duas tabelas relacionadas:
--   questions        – id, título, cenário, ordenação
--   question_options – uma linha por alternativa com o
--                      "gabarito": is_correct, advance,
--                      penalty e penalty_type.
-- A escolha do dono foi de duas tabelas, nunca uma
-- coluna JSON com as opções. O par (question_id,
-- option_index) é a chave natural e option_index é o
-- próprio selected_option que o cliente já envia.
-- Os ids são os MESMOS inteiros que o bundle usa
-- (1..35): games.question_order já guarda um array de
-- ids de questão, então ids idênticos fazem cada
-- partida existente resolver contra esta tabela sem
-- migração de dados.
-- ============================================

CREATE TABLE IF NOT EXISTS public.questions (
  id integer PRIMARY KEY,
  title text NOT NULL,
  scenario text NOT NULL,
  position integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- A coluna position é a ordenação canônica das
-- perguntas; única, como uma ordem deve ser.
CREATE UNIQUE INDEX IF NOT EXISTS questions_position_unique
  ON public.questions (position);

CREATE TABLE IF NOT EXISTS public.question_options (
  question_id integer NOT NULL REFERENCES public.questions (id) ON DELETE CASCADE,
  option_index integer NOT NULL,
  option_text text NOT NULL,
  is_correct boolean NOT NULL,
  advance integer NOT NULL,
  penalty text,
  penalty_type text,
  PRIMARY KEY (question_id, option_index),
  CHECK (penalty_type IN ('skip', 'back1', 'back2', 'start') OR penalty_type IS NULL)
);