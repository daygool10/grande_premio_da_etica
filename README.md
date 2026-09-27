# Grande Prêmio da Ética

Jogo multiplayer de perguntas sobre ética no automobilismo, apresentado como uma corrida de Fórmula 1. Cada dupla escolhe uma equipe, responde a estudos de caso e avança pelo tabuleiro conforme o resultado. Um administrador conduz a partida e revela as respostas.

## Visão geral

- Até 11 duplas podem participar de uma partida, cada uma escolhendo uma equipe de F1 diferente.
- Administrador e jogadores acessam a mesma partida em dispositivos diferentes usando um código de seis caracteres.
- O Supabase armazena partidas, participantes e respostas e sincroniza as atualizações entre as telas.
- Há 35 estudos de caso cadastrados. Cada nova partida recebe uma seleção aleatória de 20 perguntas, em uma ordem própria.
- O tabuleiro de uma partida com 20 perguntas tem 30 casas. O tamanho do percurso é calculado proporcionalmente à quantidade de perguntas.
- A duração pretendida é de aproximadamente 10 minutos, considerando cerca de 30 segundos por pergunta. Esse tempo é uma estimativa, não um limite automático: depende do ritmo das respostas e do administrador.

## Como jogar

### 1. Criar uma partida

Na tela inicial, selecione **Criar partida**. O jogo cria uma sala e exibe o código que os participantes usarão para entrar. A ordem aleatória das perguntas é salva na partida para que todos recebam exatamente a mesma sequência.

### 2. Entrar como jogador

Em cada dispositivo de jogador:

1. Selecione **Entrar na partida** e informe o código compartilhado pelo administrador.
2. Escolha um nome para a dupla.
3. Escolha uma equipe de F1 ainda não selecionada naquela partida.
4. Aguarde o administrador iniciar a corrida.

Equipes disponíveis: McLaren, Ferrari, Red Bull, Mercedes, Aston Martin, Williams, Visa Cash App, Alpine, Audi, Cadillac e Haas.

### 3. Responder às perguntas

As equipes elegíveis recebem a mesma pergunta. Cada pergunta apresenta um caso de ética e quatro alternativas, com uma resposta correta. O administrador aguarda as respostas, seleciona **Revelar Resposta** e, depois, **Próxima Pergunta**.

- A resposta correta avança a quantidade de casas definida para aquela pergunta, limitada à linha de chegada.
- A resposta incorreta aplica a penalidade descrita na alternativa: perder uma rodada ou voltar uma ou duas casas, ou ao início.
- A resposta correta só é revelada pelo administrador depois que todas as equipes elegíveis responderem.
- Equipes que já terminaram não precisam responder às perguntas seguintes.
- Quando uma equipe perde uma rodada, ela aguarda a próxima pergunta sem responder à rodada atual.

### 4. Cruzar a linha de chegada

O percurso é calculado com **1,5 casa por pergunta**, com mínimo de 10 casas. Portanto, uma partida padrão de 20 perguntas usa 30 casas. A posição é limitada ao tamanho calculado para a partida.

As equipes que cruzam a linha de chegada são classificadas pela pergunta em que terminaram. Se terminarem na mesma pergunta, fica à frente quem enviou a resposta primeiro. A tela de resultados mostra o pódio e a classificação das equipes.

## Telas e animações

- **Sala do administrador:** mostra o código da partida, o grid de largada e as equipes conectadas. O administrador inicia a corrida, revela as respostas e avança as perguntas.
- **Espera dos jogadores:** mostra o código, as equipes conectadas e uma animação de pneu soft girando. Ao iniciar a partida, o pneu sai da tela, o semáforo muda de vermelho para verde e, em seguida, aparece a primeira pergunta.
- **Pit stop do jogador:** depois de responder, o jogador continua na tela da pergunta e aguarda a revelação/rodada seguinte. Quem estiver cumprindo uma rodada perdida vê o carro de sua equipe em uma animação de pit stop. Quando o administrador avança, o carro acelera para a direita antes de a nova pergunta aparecer.
- **Resultados:** apresenta a posição final das equipes e o pódio.

As interfaces usam as cores e os carrinhos correspondentes às equipes. As animações respeitam a preferência do dispositivo por movimento reduzido.

## Executar localmente

Requisitos: Node.js compatível com Vite 7 e npm.

```bash
npm install
npm run dev
```

Para gerar e testar a versão de produção:

```bash
npm run build
npm run preview
```

## Supabase

O cliente Supabase da aplicação está configurado em [`lib/supabase.ts`](./lib/supabase.ts). O projeto precisa ter as tabelas `games`, `players` e `answers` com os campos usados pelo jogo, permissões de acesso adequadas às operações dos participantes e administrador e Realtime habilitado para as atualizações das partidas, equipes e respostas.

### Migrations

Execute as migrations no projeto Supabase associado à aplicação, pelo Supabase CLI ou pelo SQL Editor:

- [`20260926140000_unique_f1_team_per_game.sql`](./supabase/migrations/20260926140000_unique_f1_team_per_game.sql): cria uma restrição única por partida e equipe F1, evitando escolhas duplicadas. Antes de executá-la, resolva eventuais duplicatas já existentes.
- [`20260926203000_random_question_order_per_game.sql`](./supabase/migrations/20260926203000_random_question_order_per_game.sql): adiciona `question_order` à tabela `games` para persistir a sequência de perguntas de cada nova partida.
- [`20260927120000_players_only_join_waiting_games.sql`](./supabase/migrations/20260927120000_players_only_join_waiting_games.sql): impede, inclusive em uma disputa entre a largada e a entrada de um jogador, que participantes sejam adicionados depois que a partida começou.

Partidas existentes sem `question_order` continuam usando a ordem original das perguntas. A nova seleção aleatória é aplicada às partidas criadas depois da atualização.

## Estrutura do projeto

| Caminho | Responsabilidade |
| --- | --- |
| `App.tsx` | Seleciona a tela conforme o estado da partida. |
| `components/` | Telas de jogador e administrador, tabuleiro, grid, carrinhos, logos e semáforo. |
| `data/questions.tsx` | Casos, alternativas, equipes, sorteio de perguntas e cálculo do percurso. |
| `store/GameStore.ts` | Estado compartilhado e operações de partida, respostas, progresso e sincronização. |
| `lib/finishOrder.ts` | Ordenação das equipes que cruzaram a linha de chegada. |
| `lib/supabase.ts` | Cliente do Supabase. |
| `supabase/migrations/` | Alterações versionadas no banco de dados. |
| `style.css` | Estilos globais e animações. |

## Tecnologias

- React 18 e TypeScript
- Vite 7
- Tailwind CSS 3
- Zustand para estado compartilhado no cliente
- Supabase para persistência e sincronização em tempo real

## Atualizações recentes

- Perguntas embaralhadas por partida, com sequência compartilhada e persistida.
- Partidas novas limitadas a 20 perguntas dentre os 35 casos cadastrados.
- Tabuleiro ajustado para 30 casas na partida padrão e calculado proporcionalmente ao número de perguntas.
- Classificação de chegada considera a pergunta de conclusão e, em caso de empate, o horário de envio da resposta.
- Impedimento de selecionar a mesma equipe F1 mais de uma vez na mesma partida.
- Entrada de jogadores restrita a salas em espera, com validação transacional no banco.
- Resultados finais exibidos mesmo quando menos de três equipes cruzam a linha de chegada.
- Animações de largada, pit stop, troca de pneus e retorno à pista.
- Melhorias de legibilidade, tamanhos de fonte, imagens de fundo e layout das telas de espera, entrada e perguntas.
