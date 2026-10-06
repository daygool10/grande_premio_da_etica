# Grande Prêmio da Ética

Jogo multiplayer de perguntas sobre ética no automobilismo, apresentado como uma corrida de Fórmula 1.
Cada dupla escolhe uma equipe, responde aos casos e avança conforme o resultado. Um administrador conduz a
partida e revela as respostas.

## Como a corrida funciona

- As 35 perguntas são sorteadas e **todas** entram na partida: a corrida dura o conjunto inteiro.
- Resposta **correta** avança **4/3/2/1** casas conforme a velocidade entre as respostas corretas; da quarta
  colocada em diante avança 1 casa.
- Resposta **errada ou ausente** avança **0**. Não existe punição, perda de rodada nem retrocesso.
- **Não existe linha de chegada.** Ao terminar a última pergunta a classificação é calculada, como no Kahoot.
  Ninguém é eliminado no meio da corrida.
- Empates são decididos pela soma dos rankings de velocidade ao longo da corrida; persistindo, pela ordem de
  entrada na sala.
- O tabuleiro é um indicador de progresso: a escala é `4 x número de perguntas` (o máximo que uma dupla que é
  a mais rápida em todas as perguntas pode somar). Nada depende de cruzá-la.

## Onde ficam a verdade e o relógio

Tudo o que pontua vive no Postgres (Supabase), nunca no navegador:

| assunto | onde mora |
| --- | --- |
| perguntas e alternativas | tabelas `questions` e `question_options` |
| correção da resposta | `rpc_create_answer`, a partir do gabarito no banco |
| tempo de resposta | relógio do servidor, a partir de `games.question_shown_at` |
| avanço das duplas | `rpc_reveal`, atômica e idempotente |
| classificação final | `rpc_get_classification` |

- O **gabarito não sai do banco**: a pergunta é servida sem a alternativa correta e a chave só é liberada por
  `rpc_get_answer_key` **depois** da revelação.
- Nenhum relógio do jogador decide o resultado: a velocidade é medida no servidor.
- A revelação é **única**: um segundo clique não pontua de novo (retorna `already_revealed` e não escreve nada).
- O estado ao vivo chega por **Supabase Realtime** (websocket), não por polling. Um poll de 15 s existe apenas
  como rede de segurança enquanto o canal não está `SUBSCRIBED`.
- O acesso é só por RPC (`SECURITY DEFINER`) com RLS ligada; as tabelas de sessão (`private_*`) não são
  publicadas e continuam ilegíveis para o papel anônimo.

## Executar localmente

Pré-requisitos: Node 20+, Docker e a CLI do Supabase (`npx supabase`).

```bash
# 1. configura o projeto Supabase local (uma vez; cria supabase/config.toml)
npx supabase init

# 2. sobe o stack (Postgres, API, Realtime, Studio)
npx supabase start

# 3. aplica o esquema, nesta ordem: o init.sql é a base, as migrações vêm depois
psql "$(npx supabase status -o env | grep '^DB_URL=' | cut -d= -f2- | tr -d '\"')" -f supabase/init.sql
for m in supabase/migrations/*.sql; do
  psql "$(npx supabase status -o env | grep '^DB_URL=' | cut -d= -f2- | tr -d '\"')" -f "$m"
done

# 4. aponta o frontend para o stack local
cp .env.example .env      # preencha com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npx supabase status -o env | grep -E '^(API_URL|ANON_KEY)='

# 5. dependências e servidor de desenvolvimento
npm install
npm run dev
```

Scripts: `npm run dev`, `npm run build`, `npm run preview`, `npm run typecheck`, `npm test`.

## Publicar

O workflow `.github/workflows/deploy.yml` publica no GitHub Pages a cada push nas branches listadas nele,
usando os secrets `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (o `base` do Vite já é
`/grande_premio_da_etica/`).

Atenção: o projeto hospedado precisa do **mesmo SQL** aplicado no banco dele. O papel anônimo não tem DDL, então
o `supabase/init.sql` e as migrações de `supabase/migrations/` devem ser aplicados pela CLI autenticada ou pelo
SQL editor do painel, na mesma ordem.
