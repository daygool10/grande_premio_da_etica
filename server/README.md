# Servidor API - Grande Prêmio da Ética

Servidor Express que fornece a API REST do jogo e persiste os dados em PostgreSQL.

## Endpoints

### Games
- `POST /games` - Criar nova partida
- `GET /games/code/:code` - Buscar partida por código
- `GET /games/:id` - Buscar partida por ID
- `PATCH /games/:id` - Atualizar partida

### Players
- `POST /players` - Criar novo jogador
- `GET /players/:id` - Buscar jogador por ID
- `GET /players/:id/game/:gameId` - Buscar jogador por ID e partida
- `GET /games/:id/players` - Listar jogadores de uma partida
- `PATCH /players/:id` - Atualizar jogador
- `POST /players/batch-update` - Atualizar múltiplos jogadores

### Answers
- `POST /answers` - Criar resposta
- `GET /games/:id/answers` - Listar respostas de uma partida
- `GET /games/:id/answers/question/:questionIndex` - Listar respostas de uma questão específica

### RPC (Funções de presença)
- `POST /rpc/player_heartbeat` - Heartbeat do jogador
- `POST /rpc/remove_offline_player` - Remover jogador offline
- `POST /rpc/leave_waiting_player` - Jogador sai da sala de espera

### Health
- `GET /health` - Verificar saúde do servidor

### Eventos (SSE)
- `GET /events` - Stream Server-Sent Events com as mudanças de partida. Aceita `?game=<gameId>` para receber somente eventos daquela partida (ex.: `/events?game=UUID`). Cada frame é um JSON em `data:` com `table`, `op`, `id`, `game_id` e, para `games`, `phase`, `question_revealed` e `current_question_index`. Simplifica o cliente ao serviço de trigger `notify_game_event` (migração `0002_events_notify.sql`); o push não depende dos handlers da API.

## Executar localmente

Configure `DATABASE_URL` ou as variáveis `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD` e `PGDATABASE` antes de iniciar o servidor.

```bash
cd server
npm install
npm run dev
```

## Executar com Docker

```bash
docker-compose up -d
```

## Migrações

Alterações no schema são versionadas como arquivos SQL em `server/migrations/`. O `init.sql` só é aplicado pelo Docker em volume vazio, então qualquer mudança posterior precisa de uma migração.

Convenção de nomes: `NNNN_descricao.sql`, com número de quatro dígitos com zero à esquerda. Os arquivos são aplicados em ordem de nome. Para adicionar uma migração, crie o próximo número sequencial.

Para ver quais migrações seriam aplicadas sem aplicar nada:

```bash
cd server
npm run migrate -- --dry-run
```

Para aplicar as pendentes:

```bash
cd server
npm run migrate
```

A tabela `schema_migrations` registra cada arquivo aplicado (`name`, `applied_at`). Rodar duas vezes é seguro: a segunda execução não reaplica nada. Duas execuções simultâneas são bloqueadas por advisory lock. Cada migração roda na própria transação; se uma falhar, o processo encerra com erro nomeando o arquivo e nenhum registro é gravado (deletar dados é decisão do dono do banco, nunca da migração).

A migração não roda automaticamente no boot da API — esse é um efeito colateral surpresa. Execute-a manualmente com `npm run migrate`.

O mecanismo usa as mesmas configurações de conexão do `index.js`: `DATABASE_URL` ou `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` e `PGSSLMODE`.

## Limpeza de partidas abandonadas (retenção)

Os games abandonados crescem sem limite na tabela `games`. A política de retenção vive em `../lib/retention.ts` (a mesma fonte usada pelos testes em `../lib/retention.test.ts`); o runner `cleanup-games.mjs` **usa as funções desse módulo e não duplica os limiares**, carregando o TypeScript com o type stripping nativo do Node 22 (`node --experimental-strip-types`).

Dois motivos independentes selecionam um game para apagar:

1. **Stale**: `updated_at` mais antigo que **14 dias**, exceto se o game estiver entre os **25 mais recentes**.
2. **Empty lobby**: game com **zero players** e mais antigo que **24 horas**, mesmo dentro dos 25 mais recentes.

A coluna `games.updated_at` é criada pela migração `0003_games_updated_at.sql` (o `init.sql` só tinha `created_at`); a mesma migração instala o trigger `games_stamp_updated_at`, que carimba `updated_at = now()` em todo `UPDATE` de `games` — inclusive num `UPDATE` que não muda nenhum valor, pois "tocado é tocado". O runner lê a coluna direto da tabela; sem ela o script recusa rodar. Um `updated_at` que não pode ser interpretado nunca é apagado.

### Dry run (padrão)

Sem `--apply`, o runner imprime o plano do que seria apagado, com motivos, e não apaga nada. `DATABASE_URL` é obrigatória — sem ela o script recusa rodar e sai com erro, sem apagar nada.

```bash
cd server
DATABASE_URL=postgresql://daya:1234@localhost:5433/etica_f1 npm run cleanup
```

Ou direto: `node --experimental-strip-types cleanup-games.mjs`.

### Aplicar (destrutivo e irreversível)

```bash
DATABASE_URL=postgresql://daya:1234@localhost:5433/etica_f1 npm run cleanup -- --apply
```

`--apply` primeiro imprime o que vai remover e só então executa os `DELETE`s numa transação única. Se a conexão ou qualquer consulta falhar, nada é apagado e a saída é não-zero.

> **Atenção**: aplicar é **destrutivo e irreversível**. O schema declara `ON DELETE CASCADE` de `players` e `answers` (e das tabelas privadas de sessão) para `games`, então apagar um game remove os filhos automaticamente. Rode o dry run primeiro e confirme o plano antes de aplicar.
