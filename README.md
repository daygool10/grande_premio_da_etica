# 🏎️ F1 Grande Prêmio da Ética

## Descrição do Projeto

Jogo de tabuleiro multiplayer temático de Fórmula 1 com 35 perguntas sobre estudos de caso de ética no automobilismo. Suporta até 11 duplas jogando simultaneamente em dispositivos diferentes via Supabase.

## Funcionalidades

### 🎮 Modo de Jogo
- **Tela Inicial**: Botão para criar partida (adm) ou entrar (jogador)
- **Admin**: Código de 6 dígitos, controle do jogo, tabuleiro com todas as equipes
- **Jogador**: Entrada via código, escolha de nome da dupla e equipe F1

### 🏁 Mecânicas
- Tabuleiro com 10 casas até a linha de chegada
- 35 perguntas sobre ética em F1 (estudos de caso detalhados)
- Acerto: avança 2-4 casas dependendo da questão
- Erro: penalidades variadas (perder rodada, voltar 1-2 casas, voltar ao início)
- Mesmas perguntas para todas as equipes simultaneamente
- Resposta só revelada após todos responderem

### 🏆 Sistema de Vitória
- 1º, 2º e 3º lugar com pódio
- Classificação final de todas as equipes

### 🎨 Tema F1
- Interface escura estilo paddock
- Cores oficiais de cada equipe
- Logo emoji de cada time
- Tabuleiro visual com progresso das equipes

## Equipes Disponíveis
McLaren, Ferrari, Red Bull, Mercedes, Aston Martin, Williams, Visa Cash App, Alpine, Audi, Cadillac, Haas

## Stack Tecnológica
- React 18 + TypeScript
- Vite 7
- Tailwind CSS 3
- Zustand (estado)
- Supabase (banco + realtime)

## Banco de Dados
- `games`: Sessões de jogo
- `players`: Equipes/jogadores
- `answers`: Respostas dos jogadores
- Realtime habilitado para todas as tabelas
- Aplique `supabase/migrations/20260926140000_unique_f1_team_per_game.sql` no Supabase para impedir que uma equipe F1 seja escolhida por mais de uma dupla na mesma partida. A migração interrompe com erro caso já existam equipes duplicadas; resolva esses registros antes de executá-la.

## Build
```bash
npm install
npm run dev
```
