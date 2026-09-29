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
