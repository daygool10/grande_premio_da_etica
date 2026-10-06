# Verificacao do port Supabase

Medido em 2026-10-06 contra o stack local do Supabase (API 54321, DB 54322), com clientes de navegador
isolados por contexto do Chrome (`Target.createBrowserContext`). Nada foi aplicado no projeto hospedado.

## O que foi verificado ao vivo

**Mensagem do engenheiro (W1).** `lib/engineerMessages.ts` voltou a ser byte a byte o arquivo original
(`git diff` vazio). O cliente agora alimenta a mensagem com o snapshot `revealedAnswers`, que so existe
depois da revelacao, quando o servidor solta o veredito. Prova: numa pergunta respondida corretamente a
tela mostrou "Resposta correta!" e, ao avancar, o radio tocou "Precisao e velocidade! Avanco importante
para a equipe." (categoria de acerto rapido), nunca uma frase de resposta errada, com o mp3 tocando.

**Host pode pular a pergunta (W2).** O portao client-side foi removido; o botao de revelar nao depende mais
de todas as duplas responderem. Prova: com 2 duplas e 1 respondendo, o contador mostrou "1/2 responderam",
o botao estava liberado e a revelacao funcionou. A dupla silenciosa ficou 0/140 no banco e a corrida foi
jogada ate o fim, com a classificacao incluindo as duas duplas (1 Dupla Alpha 32/140, 2 Dupla Beta 0/140).

**Circuito na tela da dupla (W3).** A tela do jogador passou a renderizar o circuito com o carro da propria
dupla. Prova por geometria do DOM, uma dupla: casa 0 centro x=156, casa 4 centro x=202 depois da revelacao,
casa 8 centro x=249 depois da revelacao seguinte, sempre dentro do circuito e da viewport. Em telas
emuladas de 390x844 e 360x740 o carro continuou dentro da tela, sem rolagem horizontal.

**Caminhos degradados (W4).**

- Contador de respostas do admin: 0/2, depois 1/2 em 1,44 s e 2/2 em 0,63 s (o poll e de 2 s). Depois da
  revelacao o contador sai de cena e o intervalo para.
- Sem websocket (container do Realtime parado): o aviso do admin passou a "Tempo real: degradado" e o poll
  de reserva disparou exatamente a cada 15000 ms. Uma pergunta avancada pelo admin chegou ao jogador pelo
  poll (um unico tick, 2,75 s depois).
- Com o websocket de volta: o aviso voltou a "Tempo real: conectado", uma troca de pergunta chegou ao
  jogador em 0,52 s (tempo impossivel para um poll de 15 s) e, em 48 s parado, nenhum tick apareceu na
  cadencia de 15 s. Os unicos carregamentos observados ficaram ancorados no heartbeat de 20 s, que e um
  evento de Realtime e nao um poll.

## Nota de comportamento

O heartbeat do jogador atualiza `players.last_seen` a cada 20 s, e essa linha esta publicada no Realtime.
Cada heartbeat portanto entrega um evento para a propria dupla, que recarrega o estado. Nao e um poll, mas
explica recargas periodicas de 20 s na tela do jogador mesmo com o Realtime saudavel.

## Fluxos de sala (W5)

Jogo L8PLAC, dois clientes isolados, sala em `waiting`, grade de 20 vagas.

- Baseline: 2/20 ocupadas, 18 "Vaga disponivel", banco com 2 duplas e 1 sessao privada cada.
- Troca de identidade ("Voltar com outro nome/equipe"): recarregar a pagina do jogador levanta a tela
  "Partida anterior encontrada". O botao chama `leave_waiting_player`, que apaga a dupla e a sessao dela
  (confirmado no banco: zero sessoes privadas orfas) e devolve o jogador para a configuracao. Ele entrou de
  novo com outra dupla e outra equipe, e a grade voltou a 2/20 com os nomes novos.
- Remocao de dupla offline: com `last_seen` 5 minutos atras, o admin passou a mostrar "Desconectada" e o
  botao "Remover Dupla Gamma da grade" apareceu em cerca de 1 s, pelo evento de Realtime do UPDATE. O clique
  levou a grade de 2/20 para 1/20 e o banco ficou com uma dupla.
- Controle do portao de 90 segundos: chamando `remove_offline_player` com o token de admin real e a dupla
  ONLINE, a funcao devolveu `false` e a dupla continuou na sala. Com a mesma dupla marcada como inativa, a
  mesma chamada devolveu `true` e removeu a dupla. O portao pode falhar e falha.
- A dupla removida percebeu no heartbeat seguinte: a sessao local foi limpa e a tela voltou para
  "Entrar na partida".
