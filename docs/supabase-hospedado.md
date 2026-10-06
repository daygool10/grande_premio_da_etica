# Ligar a versao Supabase no projeto hospedado

Este port correu inteiro contra um Supabase local. **Nada foi aplicado no seu projeto hospedado.** Os passos
abaixo sao para voce rodar, quando quiser.

## O que vai ser aplicado

`supabase/init.sql` cria o schema base (games, players, answers, private_game_admin_sessions,
private_player_sessions, RLS e a familia de RPCs). Depois, as migracoes em `supabase/migrations/` na ordem do
nome do arquivo:

    20261006010000_questions_and_grading.sql   tabelas de perguntas e correcao no servidor
    20261006020000_questions_seed.sql          as 35 perguntas e as 140 alternativas
    20261006030000_reveal.sql                  rpc_reveal atomica e a chave so depois da revelacao
    20261006040000_classification.sql          classificacao final
    20261006050000_answers_unique.sql          uma resposta por dupla por pergunta
    20261006060000_server_deal.sql             o servidor sorteia as perguntas
    20261006070000_realtime.sql                jogos, duplas e respostas no Realtime
    20261006080000_authoring.sql               autoria de perguntas pelo host
    20261006090000_race_length.sql             sorteio validado e comprimento da corrida
    20261006100000_retention.sql               updated_at e limpeza de partidas abandonadas

## Antes de comecar (pre-flight)

1. Faca um backup do projeto (Dashboard, Database, Backups) ou um dump antes de mexer.
2. Copie a connection string do projeto em Settings, Database, Connection string, modo Session (a que tem
   `db.<ref>.supabase.co`). O `psql` da sua maquina precisa alcancar essa porta.
3. Copie a URL do projeto e a chave anon em Settings, API. Elas vao para os secrets do GitHub, nao para o
   repositorio.
4. Veja o que ja existe no banco antes de aplicar qualquer coisa. Rode:

       psql "<connection string>" -c "\dt public.*"

   Se a lista estiver vazia, aplique tudo na ordem abaixo. Se `games` e `players` ja existirem, o
   `supabase/init.sql` foi aplicado antes: nesse caso pule o passo 1 e aplique so as migracoes que faltarem,
   ainda na ordem do nome. O `init.sql` inteiro usa `IF NOT EXISTS`, mas nao vale a pena arriscar.

## Aplicar, na ordem exata

    export DB="<connection string do projeto>"

    psql "$DB" -v ON_ERROR_STOP=1 -f supabase/init.sql
    psql "$DB" -v ON_ERROR_STOP=1 -f supabase/migrations/20261006010000_questions_and_grading.sql
    psql "$DB" -v ON_ERROR_STOP=1 -f supabase/migrations/20261006020000_questions_seed.sql
    psql "$DB" -v ON_ERROR_STOP=1 -f supabase/migrations/20261006030000_reveal.sql
    psql "$DB" -v ON_ERROR_STOP=1 -f supabase/migrations/20261006040000_classification.sql
    psql "$DB" -v ON_ERROR_STOP=1 -f supabase/migrations/20261006050000_answers_unique.sql
    psql "$DB" -v ON_ERROR_STOP=1 -f supabase/migrations/20261006060000_server_deal.sql
    psql "$DB" -v ON_ERROR_STOP=1 -f supabase/migrations/20261006070000_realtime.sql
    psql "$DB" -v ON_ERROR_STOP=1 -f supabase/migrations/20261006080000_authoring.sql
    psql "$DB" -v ON_ERROR_STOP=1 -f supabase/migrations/20261006090000_race_length.sql
    psql "$DB" -v ON_ERROR_STOP=1 -f supabase/migrations/20261006100000_retention.sql

O `ON_ERROR_STOP=1` e de proposito: se algum arquivo falhar, o psql para em vez de continuar com o banco pela
metade. Se preferir, o mesmo conteudo pode ser colado no SQL Editor do Dashboard, um arquivo por vez, na
mesma ordem.

## Conferir depois

    psql "$DB" -c "select count(*) as perguntas from public.questions;"
    psql "$DB" -c "select count(*) as alternativas from public.question_options;"
    psql "$DB" -c "select public.rpc_list_question_ids();"
    psql "$DB" -c "select proname from pg_proc where proname like 'rpc_%' order by 1;"

O esperado: 35 perguntas, 140 alternativas, e as RPCs `rpc_reveal`, `rpc_get_answer_key`,
`rpc_get_dealt_questions`, `rpc_get_classification`, `rpc_author_save_question`, `rpc_cleanup_games` e as
demais da lista.

## Secrets do GitHub

O workflow `deploy.yml` roda quando `port/supabase` ou as branches principais recebem push, e le dois
secrets. Eles precisam existir em Settings, Secrets and variables, Actions:

    VITE_SUPABASE_URL       a URL do projeto, por exemplo https://<ref>.supabase.co
    VITE_SUPABASE_ANON_KEY  a chave anon publica do projeto

Sem eles o build publica um site sem banco. Depois de cadastrar, rode o workflow de novo (Actions,
Deploy, Run workflow).

## Coisas que valem saber

- A chave anon e publica e vai no bundle; toda a logica de correcao vive nas RPCs, e as tabelas de perguntas
  nao tem policy nenhuma para o anon, entao ninguem le o gabarito por fora das RPCs.
- O `Realtime` da versao hospedada precisa da publicacao criada pela migracao 070000; ela ja faz isso.
- A limpeza de partidas antigas nao roda sozinha. Se voce quiser um cron, o caminho e uma Edge Function
  agendada ou um agendador externo chamando `rpc_cleanup_games`; nada foi agendado por conta propria.
- Nenhum passo aqui toca no seu banco sem voce rodar o comando. O port nao aplicou nada no projeto
  hospedado.
