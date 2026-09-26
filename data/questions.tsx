export interface Question {
  id: number;
  title: string;
  scenario: string;
  options: {
    text: string;
    isCorrect: boolean;
    advance: number;
    penalty: string | null;
    penaltyType: 'skip' | 'back1' | 'back2' | 'start' | null;
  }[];
}

export const F1_TEAMS = [
  'McLaren', 'Ferrari', 'Red Bull', 'Mercedes', 'Aston Martin',
  'Williams', 'Visa Cash App', 'Alpine', 'Audi', 'Cadillac', 'Haas',
];

export const TEAM_COLORS: Record<string, string> = {
  'McLaren': '#FF8000', 'Ferrari': '#E80020', 'Red Bull': '#3671C6',
  'Mercedes': '#27F4D2', 'Aston Martin': '#229971', 'Williams': '#64C4FF',
  'Visa Cash App': '#6692FF', 'Alpine': '#FF87BC', 'Audi': '#C0C0C0',
  'Cadillac': '#00594F', 'Haas': '#B6BABD',
};

export const questions: Question[] = [
  {
    id: 1,
    title: 'Spygate - Espionagem McLaren-Ferrari (2007)',
    scenario: 'Em 2007, o chefe mecânico da Ferrari Nigel Stepney passou ao designer-chefe da McLaren Mike Coughlan um dossiê confidencial de quase 800 páginas com segredos técnicos da Ferrari. Coughlan levou as cópias à sua esposa, que foi flagrada numa gráfica em Woking. A McLaren alegou que nenhum dado foi incorporado ao carro, mas evidências posteriores mostraram que engenheiros da McLaren acessaram o material. A FIA desclassificou a McLaren do campeonato de construtores e aplicou a maior multa da história da F1: US$ 100 milhões.',
    options: [
      { text: 'A multa foi excessiva, pois os dados não foram incorporados ao carro e a competição na pista não foi afetada', isCorrect: false, advance: 0, penalty: 'Voltar 1 casa por minimizar espionagem', penaltyType: 'back1' },
      { text: 'A Ferrari deveria processar Stepney criminalmente, mas a FIA não deveria punir a McLaren como equipe', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por evadir responsabilidade institucional', penaltyType: 'skip' },
      { text: 'Todos os times deveriam compartilhar seus dados técnicos para evitar espionagem no futuro', isCorrect: false, advance: 0, penalty: 'Voltar ao início por proposta antiética', penaltyType: 'start' },
      { text: 'A punição foi justa: espionagem corporativa deve ter consequências severas para proteger a integridade competitiva', isCorrect: true, advance: 3, penalty: null, penaltyType: null },
    ],
  },
  {
    id: 2,
    title: 'Crashgate - Acidente Forçado em Singapura (2008)',
    scenario: 'No GP de Singapura de 2008, Nelson Piquet Jr., piloto da Renault, bateu deliberadamente na curva 17 a mando dos diretores Flávio Briatore e Pat Symonds. O acidente trouxe o safety car, permitindo que Fernando Alonso, que havia feito pit stop na volta anterior, assumisse a liderança e vencesse. Piquet Jr. só revelou a conspiração um ano depois, após ser dispensado pela Renault. Briatore recebeu banimento vitalício e Symonds foi banido por 5 anos.',
    options: [
      { text: 'A Renault deveria ser desclassificada de toda a temporada, mas os banimentos individuais foram suficientes', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por punição branda', penaltyType: 'skip' },
      { text: 'O caso deveria ter sido arquivado, pois Piquet Jr. só denunciou por vingança após ser dispensado', isCorrect: false, advance: 0, penalty: 'Voltar ao início por descartar confissão', penaltyType: 'start' },
      { text: 'Manipular o resultado de uma corrida é a forma mais grave de trapaça, e os responsáveis devem ser banidos permanentemente', isCorrect: true, advance: 4, penalty: null, penaltyType: null },
      { text: 'Alonso não sabia do plano, então não deveria perder sua vitória, pois foi um piloto inocente', isCorrect: false, advance: 0, penalty: 'Voltar 2 casas por defender resultado manchado', penaltyType: 'back2' },
    ],
  },
  {
    id: 3,
    title: 'Prost vs Senna - Colisão em Suzuka (1989)',
    scenario: 'No GP do Japão de 1989, os companheiros de equipe da McLaren Alain Prost e Ayrton Senna brigavam pelo campeonato. Na chicane, Prost fechou a porta e Senna insistiu na ultrapassagem, resultando em colisão. Prost abandonou, mas Senna retornou à pista e venceu a corrida - apenas para ser desclassificado por ter cortado a chicane, entregando o título a Prost. Senna acusou a FIA de parcialidade.',
    options: [
      { text: 'Team orders da McLaren deveriam ter definido o resultado antes da corrida, evitando o conflito', isCorrect: false, advance: 0, penalty: 'Voltar ao início por apoiar manipulação prévia', penaltyType: 'start' },
      { text: 'A desclassificação de Senna foi correta, pois ele cortou a pista para retornar e obteve vantagem injusta', isCorrect: true, advance: 2, penalty: null, penaltyType: null },
      { text: 'Prost provocou a colisão ao fechar propositalmente a porta, e deveria ter sido punido também', isCorrect: false, advance: 0, penalty: 'Voltar 1 casa por ignorar provocação', penaltyType: 'back1' },
      { text: 'A FIA deveria ter anulado a corrida inteira, pois ambos os pilotos agiram antidesportivamente', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por proposta radical', penaltyType: 'skip' },
    ],
  },
  {
    id: 4,
    title: 'Senna vs Prost - Retaliação em Suzuka (1990)',
    scenario: 'No GP do Japão de 1990, Senna partiu da pole e Prost da segunda posição na Ferrari. Na primeira curva, Senna não freou e colidiu propositalmente com Prost, eliminando ambos da corrida. Senna assumiu posteriormente que foi uma vingança pela desclassificação de 1989. A FIA não aplicou nenhuma punição, e Senna conquistou o campeonato daquela temporada.',
    options: [
      { text: 'Senna deveria ter sido desclassificado do campeonato por admitir ter causado a colisão intencionalmente', isCorrect: true, advance: 3, penalty: null, penaltyType: null },
      { text: 'A FIA deveria ter investigado mais a fundo, mas sem a confissão formal na época não havia provas suficientes', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por justificar impunidade', penaltyType: 'skip' },
      { text: 'Prost também agiu de forma antiética em 1989, então ambos deveriam ter sido punidos igualmente', isCorrect: false, advance: 0, penalty: 'Voltar 1 casa por relativizar atropelamento', penaltyType: 'back1' },
      { text: 'A colisão foi apenas uma disputa acirrada entre rivais, e não deveria ter consequências esportivas', isCorrect: false, advance: 0, penalty: 'Voltar ao início por normalizar violência', penaltyType: 'start' },
    ],
  },
  {
    id: 5,
    title: 'Schumacher vs Hill - Adelaide (1994)',
    scenario: 'No GP da Austrália de 1994, Michael Schumacher (Benetton) liderava o campeonato com apenas 1 ponto de vantagem sobre Damon Hill (Williams). Schumacher saiu da pista e bateu lateralmente na barreira, possivelmente danificando a suspensão. Na curva seguinte, Hill tentou ultrapassar por dentro, mas Schumacher fechou o caminho, causando colisão que eliminou ambos. Schumacher conquistou o título.',
    options: [
      { text: 'Hill também poderia ter esperado, pois sabia que Schumacher estava com o carro danificado', isCorrect: false, advance: 0, penalty: 'Voltar 1 casa por culpar a vítima', penaltyType: 'back1' },
      { text: 'Acidentes fazem parte da F1, e os comissários decidiram que não houve intenção, então o resultado deveria permanecer', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por ignorar evidências', penaltyType: 'skip' },
      { text: 'Ambos deveriam ter sido desclassificados da corrida para punir o comportamento perigoso', isCorrect: false, advance: 0, penalty: 'Voltar ao início por punição coletiva injusta', penaltyType: 'start' },
      { text: 'Schumacher deveria ter sido desclassificado do campeonato por colisão deliberada para garantir o título', isCorrect: true, advance: 3, penalty: null, penaltyType: null },
    ],
  },
  {
    id: 6,
    title: 'Schumacher vs Villeneuve - Jerez (1997)',
    scenario: 'No GP da Espanha de 1997, Jacques Villeneuve (Williams) fez uma ultrapassagem limpa em Michael Schumacher (Ferrari) na curva Dry Sac. Schumacher desviou deliberadamente para a esquerda, colidindo com o lado do carro de Villeneuve. Schumacher ficou preso na cascalho, enquanto Villeneuve continuou e conquistou o título. A FIA desclassificou Schumacher de todo o campeonato de 1997.',
    options: [
      { text: 'Villeneuve também dirigiu de forma agressiva ao tentar a ultrapassagem, dividindo a responsabilidade', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por culpar a vítima', penaltyType: 'skip' },
      { text: 'A punição deveria ter sido aplicada na época, não meses depois, para manter a credibilidade', isCorrect: false, advance: 0, penalty: 'Voltar ao início por questionar timing da justiça', penaltyType: 'start' },
      { text: 'A desclassificação foi merecida: colisão deliberada é a ofensa mais grave que um piloto pode cometer', isCorrect: true, advance: 3, penalty: null, penaltyType: null },
      { text: 'Schumacher deveria ter sido banido de mais corridas, pois a desclassificação não afetou seu desempenho', isCorrect: false, advance: 0, penalty: 'Voltar 2 casas por punição insuficiente', penaltyType: 'back2' },
    ],
  },
  {
    id: 7,
    title: 'Schumacher - Estacionamento em Mônaco (2006)',
    scenario: 'Na classificação do GP de Mônaco de 2006, Michael Schumacher (Ferrari) parou seu carro na curva Rascasse a apenas 16 km/h, bloqueando a volta rápida de Fernando Alonso (Renault). Schumacher alegou que travou as rodas, mas os comissários analisaram a telemetria e concluiu que o travamento ocorreu a uma velocidade muito baixa para ser acidental. Schumacher foi punido com a última posição no grid.',
    options: [
      { text: 'Os comissários deveriam ter apenas advertido Schumacher, pois ele estava sob pressão da classificação', isCorrect: false, advance: 0, penalty: 'Voltar ao início por defender trapaça', penaltyType: 'start' },
      { text: 'A punição foi justa: bloquear propositalmente a pista é trapaça, independentemente da velocidade', isCorrect: true, advance: 2, penalty: null, penaltyType: null },
      { text: 'Schumacher deveria ter sido desclassificado da classificação, não apenas reposicionado no grid', isCorrect: false, advance: 0, penalty: 'Voltar 2 casas por punição branda', penaltyType: 'back2' },
      { text: 'Pilotos frequentemente cometem erros em Mônaco, e não havia prova conclusiva de intenção', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por ignorar telemetria', penaltyType: 'skip' },
    ],
  },
  {
    id: 8,
    title: 'Team Orders - Áustria (2002)',
    scenario: 'No GP da Áustria de 2002, os dois pilotos da Ferrari lideravam a corrida. Na última reta, Rubens Barrichello, que estava na liderança, foi instruído pelo rádio a reduzir a velocidade para que Michael Schumacher ultrapassasse e vencesse. A troca de posições ocorreu a apenas 50 metros da linha de chegada, diante de uma torcida que vaiou o resultado. A FIA proibiu team orders a partir de 2003.',
    options: [
      { text: 'Team orders explícitos destroem a credibilidade da competição e deveriam ser permanentemente proibidos', isCorrect: true, advance: 3, penalty: null, penaltyType: null },
      { text: 'A Ferrari tinha direito de definir sua estratégia interna, pois as equipes investem bilhões nos carros', isCorrect: false, advance: 0, penalty: 'Voltar 1 casa por defender manipulação', penaltyType: 'back1' },
      { text: 'Barrichello deveria ter recusado a ordem, pois o resultado na pista deve ser decidido pelo piloto', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por ignorar contrato de piloto', penaltyType: 'skip' },
      { text: 'A punição deveria ter sido financeira, sem alterar os resultados da corrida', isCorrect: false, advance: 0, penalty: 'Voltar ao início por minimizar impacto', penaltyType: 'start' },
    ],
  },
  {
    id: 9,
    title: '"Felipe, Fernando é mais rápido" - Alemanha (2010)',
    scenario: 'No GP da Alemanha de 2010, Felipe Massa liderava para a Ferrari quando seu engenheiro Rob Smedley transmitiu pelo rádio: "Felipe, Fernando é mais rápido que você. Você confirma que entendeu a mensagem?". Massa cedeu a posição para Fernando Alonso. A FIA multou a Ferrari em US$ 100.000, mas manteve os resultados. Após a temporada, a FIA revogou a proibição de team orders.',
    options: [
      { text: 'A Ferrari deveria ter recebido punição mais severa, pois violou diretamente o regulamento vigente', isCorrect: true, advance: 2, penalty: null, penaltyType: null },
      { text: 'Massa deveria ter ignorado a ordem e mantido a posição, demonstrando integridade esportiva', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por ignorar realidade contratual', penaltyType: 'skip' },
      { text: 'A FIA deveria ter mantido a proibição e aplicado punições mais pesadas a equipes que usam team orders', isCorrect: false, advance: 0, penalty: 'Voltar ao início por punição retroativa', penaltyType: 'start' },
      { text: 'Team orders deveriam ser permitidos, pois fazem parte da estratégia legítima de qualquer equipe esportiva', isCorrect: false, advance: 0, penalty: 'Voltar 1 casa por apoiar manipulação', penaltyType: 'back1' },
    ],
  },
  {
    id: 10,
    title: 'Multi21 - Vettel Desobedece Equipe (2013)',
    scenario: 'No GP da Malásia de 2013, Sebastian Vettel e Mark Webber da Red Bull estavam em primeiro e segundo lugar. A equipe transmitiu a mensagem codificada "Multi21" (modo do motor 2, piloto 1 lidera), instruindo Webber a manter a posição. Vettel ignorou a ordem, ultrapassou Webber e venceu a corrida. O team principal Christian Horner declarou publicamente que Vettel havia desobedecido ordens claras.',
    options: [
      { text: 'Webber também teve culpa por não defender agressivamente a posição na última volta', isCorrect: false, advance: 0, penalty: 'Voltar 1 casa por culpar a vítima', penaltyType: 'back1' },
      { text: 'Vettel estava certo: na F1, o piloto mais rápido deveria sempre vencer, independentemente de ordens', isCorrect: false, advance: 0, penalty: 'Voltar ao início por defender desobediência', penaltyType: 'start' },
      { text: 'Vettel deveria ter sido punido internamente pela Red Bull por desobediência direta de ordens', isCorrect: true, advance: 2, penalty: null, penaltyType: null },
      { text: 'A FIA deveria proibir team orders, pois criam situações onde o público perde confiança nos resultados', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por proposta radical', penaltyType: 'skip' },
    ],
  },
  {
    id: 11,
    title: 'Hamilton vs Rosberg - Colisão na Espanha (2016)',
    scenario: 'No GP da Espanha de 2016, Lewis Hamilton e Nico Rosberg, companheiros de equipe da Mercedes, colidiram na primeira curva na primeira volta. Ambos abandonaram. A investigação da Mercedes revelou que Rosberg havia acionado um botão de configuração errado, perdendo potência, e Hamilton tentou ultrapassar pelo lado interno. A colisão eliminou ambos e foi o primeiro de vários confrontos físicos entre os dois na temporada.',
    options: [
      { text: 'A FIA deveria ter punido ambos os pilotos por condução perigosa, não apenas a Mercedes internamente', isCorrect: false, advance: 0, penalty: 'Voltar ao início por punição excessiva', penaltyType: 'start' },
      { text: 'A Mercedes deveria ter aplicado sanções internas severas para evitar repetição de confrontos', isCorrect: true, advance: 2, penalty: null, penaltyType: null },
      { text: 'O acidente foi apenas uma consequência natural da disputa entre dois campeões igualmente talentosos', isCorrect: false, advance: 0, penalty: 'Voltar 1 casa por normalizar violência entre companheiros', penaltyType: 'back1' },
      { text: 'Hamilton deveria ter esperado, pois sabia que Rosberg estava em desvantagem técnica', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por culpar a vítima', penaltyType: 'skip' },
    ],
  },
  {
    id: 12,
    title: 'Hamilton vs Rosberg - Colisão na Áustria (2016)',
    scenario: 'No GP da Áustria de 2016, Hamilton e Rosberg colidiram na última curva da última volta. Hamilton, que liderava, fechou a porta para Rosberg, que tentou ultrapassar. Rosberg perdeu a frente do carro e Hamilton venceu com o sidepod danificado. A Mercedes culpou ambos os pilotos pela situação, mas não aplicou punições externas.',
    options: [
      { text: 'Hamilton fechou deliberadamente a porta e deveria ter recebido penalidade de tempo', isCorrect: false, advance: 0, penalty: 'Voltar 1 casa por culpar o vencedor', penaltyType: 'back1' },
      { text: 'Rosberg tentou uma ultrapassagem arriscada e deveria ter aceitado o segundo lugar', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por desencorajar competitividade', penaltyType: 'skip' },
      { text: 'A colisão foi resultado da pressão da equipe e a Mercedes compartilha a responsabilidade', isCorrect: true, advance: 3, penalty: null, penaltyType: null },
      { text: 'Nenhum piloto deveria ser punido, pois disputas na última volta fazem parte da essência da F1', isCorrect: false, advance: 0, penalty: 'Voltar ao início por normalizar colisão', penaltyType: 'start' },
    ],
  },
  {
    id: 13,
    title: 'Red Bull - Violação do Teto de Orçamento (2022)',
    scenario: 'Em 2022, a FIA descobriu que a Red Bull havia excedido o teto de orçamento em 1,864 milhões de libras na temporada de 2021. A Red Bull alegou que o excesso foi involuntário, causado por interpretações divergentes das regras. A FIA classificou a violação como "menor", mas aplicou uma multa de US$ 7 milhões e retirada de 10% do tempo de teste em wind tunnel. A Ferrari e a Mercedes consideraram a punição branda demais.',
    options: [
      { text: 'A classificação como "menor" foi correta, pois o excesso foi involuntário e não afetou os resultados na pista', isCorrect: false, advance: 0, penalty: 'Voltar 2 casas por defender impunidade', penaltyType: 'back2' },
      { text: 'A FIA deveria ter proibido a Red Bull de participar da temporada seguinte como punição exemplar', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por proposta desproporcional', penaltyType: 'skip' },
      { text: 'O teto de orçamento deveria ser abolido, pois as equipes maiores sempre encontrarão formas de contornar as regras', isCorrect: false, advance: 0, penalty: 'Voltar ao início por eliminar regulamento essencial', penaltyType: 'start' },
      { text: 'A punição foi branda: uma violação de orçamento deveria resultar em desclassificação do campeonato', isCorrect: true, advance: 3, penalty: null, penaltyType: null },
    ],
  },
  {
    id: 14,
    title: 'Benetton - Controle de Lançamento Ilegal (1994)',
    scenario: 'Em 1994, a FIA descobriu que a Benetton mantinha um software de controle de lançamento ("option 13") em seus carros, apesar de ter sido proibido naquela temporada. A equipe argumentou que era apenas para testes, mas o software podia ser ativado via laptop e sequência de botões no volante. A FIA não encontrou evidência de uso em corrida, mas a descoberta gerou enorme desconfiança, especialmente após a morte de Ayrton Senna em Imola.',
    options: [
      { text: 'A FIA deveria ter investigado mais a fundo, mas sem evidências concretas a equipe deveria ser inocente', isCorrect: false, advance: 0, penalty: 'Voltar 1 casa por evadir responsabilidade', penaltyType: 'back1' },
      { text: 'Todos os times deveriam ser obrigados a compartilhar seu código-fonte com a FIA para evitar trapaças', isCorrect: false, advance: 0, penalty: 'Voltar ao início por vigilância excessiva', penaltyType: 'start' },
      { text: 'A Benetton deveria ter sido desclassificada da temporada inteira por manter software ilegal', isCorrect: true, advance: 3, penalty: null, penaltyType: null },
      { text: 'A ausência de prova de uso em corrida deveria isentar a equipe de punição esportiva', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por dar margem a desculpas', penaltyType: 'skip' },
    ],
  },
  {
    id: 15,
    title: 'BAR - Tanque Secreto (2005)',
    scenario: 'Após o GP de San Marino de 2005, a BAR Honda foi desclassificada quando seus carros foram encontrados abaixo do peso mínimo em inspeção pós-corrida. Uma investigação revelou que os carros continham um tanque de combustível secundário escondido, usado para manter o peso mínimo durante a inspeção enquanto o carro corria abaixo do peso na pista. A FIA aplicou um banimento de duas corridas a BAR.',
    options: [
      { text: 'Truques técnicos fazem parte da história da F1, e a BAR estava apenas inovando dentro das margens', isCorrect: false, advance: 0, penalty: 'Voltar ao início por defender trapaça', penaltyType: 'start' },
      { text: 'O banimento de duas corridas foi insuficiente: a BAR deveria ter sido desclassificada de toda a temporada', isCorrect: true, advance: 3, penalty: null, penaltyType: null },
      { text: 'A BAR argumentou que o tanque era para segurança, e a FIA deveria ter sido mais clara nas regras', isCorrect: false, advance: 0, penalty: 'Voltar 2 casas por aceitar desculpa fraca', penaltyType: 'back2' },
      { text: 'A Honda proprietária deveria ter responsabilidade sobre o projeto do carro, não a equipe de corrida', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por fragmentar responsabilidade', penaltyType: 'skip' },
    ],
  },
  {
    id: 16,
    title: 'Brabham - Freios Refrigerados (1982)',
    scenario: 'Em 1982, as equipes de motor aspirado (Brabham, Williams, McLaren) usaram um truque para correr abaixo do peso mínimo: encheram tanques de água antes da largada, escoando-a para os freios durante a corrida, e reabastecendo após a bandeirada para passar na inspeção. Nelson Piquet (Brabham) e Keke Rosberg (Williams) venceram as primeiras corridas usando o truque, mas foram desclassificados quando o esquema foi descoberto.',
    options: [
      { text: 'A desclassificação foi correta: qualquer truque que viole o peso mínimo é trapaça', isCorrect: true, advance: 3, penalty: null, penaltyType: null },
      { text: 'As equipes estavam apenas explorando uma brecha no regulamento, e a FIA deveria ter previsto isso', isCorrect: false, advance: 0, penalty: 'Voltar 1 casa por defender trapaça', penaltyType: 'back1' },
      { text: 'Todas as equipes que usaram o truque deveriam ter sido desclassificadas, não apenas as flagradas', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por punição seletiva', penaltyType: 'skip' },
      { text: 'O regulamento deveria ser alterado para permitir reabastecimento de água', isCorrect: false, advance: 0, penalty: 'Voltar ao início por flexibilizar regras', penaltyType: 'start' },
    ],
  },
  {
    id: 17,
    title: 'Tyrrell - Chumbo na Água (1984)',
    scenario: 'Em 1984, a Tyrrell, equipe pequena com motor aspirado contra rivais com turbo, usou um truque elaborado: enchia o tanque de água com chumbo líquido durante as últimas paradas, permitindo correr abaixo do peso na maior parte da corrida e só adicionando peso antes da inspeção. A FIA desclassificou toda a temporada da Tyrrell e baniu os pilotos das últimas três corridas.',
    options: [
      { text: 'A Tyrrell estava em desvantagem técnica e o truque foi uma tentativa desesperada de competir', isCorrect: false, advance: 0, penalty: 'Voltar 1 casa por simpatizar com trapaça', penaltyType: 'back1' },
      { text: 'Os pilotos (Martin Brundle e Stefan Bellof) não deveriam ser punidos pelos erros da equipe', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por separar responsabilidades', penaltyType: 'skip' },
      { text: 'A FIA deveria ter permitido o truque para equipes menores como forma de equalização', isCorrect: false, advance: 0, penalty: 'Voltar ao início por aceitar fraude', penaltyType: 'start' },
      { text: 'A desclassificação de toda a temporada foi justa, pois o truque era uma fraude descarada', isCorrect: true, advance: 3, penalty: null, penaltyType: null },
    ],
  },
  {
    id: 18,
    title: 'Piquet Jr. - Acidente Orquestrado no Brasil (2009)',
    scenario: 'No GP do Brasil de 2009, Nelson Piquet Jr. bateu propositalmente na curva 3 a mando da equipe Renault, trazendo o safety car para benefício de Fernando Alonso. O acidente foi menos sutil que o da Singapura de 2008, e investigadores da FIA logo identificaram o padrão. Piquet Jr. confirmou que a equipe havia planejado o acidente, e a Renault recebeu um banimento suspenso de duas corridas.',
    options: [
      { text: 'Piquet Jr. deveria ter recusado a ordem e reportado a FIA imediatamente', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por culpar o executor', penaltyType: 'skip' },
      { text: 'O safety car é parte natural da F1, e a Renault apenas explorou as regras', isCorrect: false, advance: 0, penalty: 'Voltar ao início por normalizar manipulação', penaltyType: 'start' },
      { text: 'A Renault deveria ter sido desclassificada permanentemente, não apenas com banimento suspenso', isCorrect: true, advance: 3, penalty: null, penaltyType: null },
      { text: 'O banimento suspenso foi suficiente, pois a Renault já havia perdido patrocinadores e credibilidade', isCorrect: false, advance: 0, penalty: 'Voltar 2 casas por punição branda', penaltyType: 'back2' },
    ],
  },
  {
    id: 19,
    title: 'Schumacher - Desrespeito à Bandeira Preta (1994)',
    scenario: 'No GP da Inglaterra de 1994, Schumacher recebeu uma bandeira preta por ter ultrapassado Damon Hill na volta de formação, mas ignorou a sinalização por várias voltas. A FIA o desclassificou da corrida e depois o suspendeu por duas corridas, além de multa. O caso demonstrou a disposição de Schumacher de ignorar regras em busca do título.',
    options: [
      { text: 'Schumacher não viu a bandeira, pois a comunicação entre pista e piloto era deficiente na época', isCorrect: false, advance: 0, penalty: 'Voltar ao início por desculpa fraca', penaltyType: 'start' },
      { text: 'Ignorar uma bandeira preta é a ofensa mais grave possível: Schumacher deveria ter sido desclassificado do campeonato', isCorrect: true, advance: 3, penalty: null, penaltyType: null },
      { text: 'A suspensão de duas corridas foi suficiente como punição exemplar', isCorrect: false, advance: 0, penalty: 'Voltar 2 casas por punição branda', penaltyType: 'back2' },
      { text: 'A equipe Benetton deveria ter responsabilidade por não ordenar que o piloto parasse', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por evadir responsabilidade do piloto', penaltyType: 'skip' },
    ],
  },
  {
    id: 20,
    title: 'Hamilton - Colisão com Massa na Bélgica (2008)',
    scenario: 'No GP da Bélgica de 2008, Lewis Hamilton e Felipe Massa colidiram na curva de Les Combes. Hamilton tentou ultrapassar Massa pelo lado de fora, mas Massa manteve a posição e os carros se tocaram. Os comissários puniram Hamilton com drive-through penalty, mas Hamilton argumentou que Massa havia fechado a porta de forma perigosa. O caso gerou debate sobre limites na ultrapassagem.',
    options: [
      { text: 'Hamilton deveria ter aceitado a posição e tentado outra vez, pois a ultrapassagem era arriscada naquele ponto', isCorrect: true, advance: 2, penalty: null, penaltyType: null },
      { text: 'Massa deveria ter sido punido por fechar a porta de forma perigosa e quase causar acidente', isCorrect: false, advance: 0, penalty: 'Voltar 1 casa por culpar a vítima', penaltyType: 'back1' },
      { text: 'Ambos os pilotos agiram dentro dos limites do automobilismo agressivo e não deveria haver punição', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por normalizar condução perigosa', penaltyType: 'skip' },
      { text: 'Os comissários deveriam ter anulado a penalidade, pois disputas de pista não devem ser julgadas com drive-through', isCorrect: false, advance: 0, penalty: 'Voltar ao início por questionar autoridade dos comissários', penaltyType: 'start' },
    ],
  },
  {
    id: 21,
    title: 'Verstappen vs Leclerc - Áustria (2019)',
    scenario: 'No GP da Áustria de 2019, Max Verstappen e Charles Leclerc duelaram intensamente nas últimas voltas. Na última volta, Verstappen fez uma manobra agressiva na saída da curva 3, empurrando Leclerc para fora da pista e assumindo a liderança. Os comissários consideraram que ambos mantiveram a posição dentro dos limites e não aplicaram punição, gerando enorme controvérsia sobre o que é permitido em disputas de pilotos.',
    options: [
      { text: 'A decisão dos comissários foi correta: disputas agressivas fazem parte da essência da F1', isCorrect: false, advance: 0, penalty: 'Voltar 1 casa por apoiar condução perigosa', penaltyType: 'back1' },
      { text: 'Leclerc deveria ter defendido mais agressivamente a posição na entrada da curva', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por culpar o piloto prejudicado', penaltyType: 'skip' },
      { text: 'A FIA deveria definir regras mais claras sobre quando uma manobra é considerada agressiva demais', isCorrect: false, advance: 0, penalty: 'Voltar ao início por fugir do problema', penaltyType: 'start' },
      { text: 'Verstappen deveria ter recebido penalidade por empurrar Leclerc para fora da pista', isCorrect: true, advance: 3, penalty: null, penaltyType: null },
    ],
  },
  {
    id: 22,
    title: 'Alonso vs Webber - Silverstone (2010)',
    scenario: 'No GP da Inglaterra de 2010, Fernando Alonso e Mark Webber colidiram na primeira volta. Webber tentou ultrapassar Alonso pelo lado de fora na curva 6, mas Alonso não deixou espaço suficiente e os carros se tocaram, danificando o lado do carro de Webber. Os comissários não aplicaram punição, mas Webber declarou publicamente que Alonso havia dirigido de forma perigosa.',
    options: [
      { text: 'Os comissários acertaram ao não punir, pois ambos mantiveram trajetórias previsíveis', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por ignorar falta de espaço', penaltyType: 'skip' },
      { text: 'A colisão foi acidental e não deveria ter consequências esportivas para nenhum dos pilotos', isCorrect: false, advance: 0, penalty: 'Voltar ao início por minimizar responsabilidade', penaltyType: 'start' },
      { text: 'Alonso deveria ter sido punido por não deixar espaço suficiente para Webber na curva', isCorrect: true, advance: 2, penalty: null, penaltyType: null },
      { text: 'Webber tentou uma ultrapassagem impossível e assumiu o risco ao tentar pelo lado de fora', isCorrect: false, advance: 0, penalty: 'Voltar 1 casa por culpar a vítima', penaltyType: 'back1' },
    ],
  },
  {
    id: 23,
    title: 'Grosjean - Acidente no Pit Lane de Abu Dhabi (2012)',
    scenario: 'No GP de Abu Dhabi de 2012, Romain Grosjean (Lotus) bateu no carro de Lewis Hamilton (McLaren) no pit lane durante a parada de abastecimento. O impacto danificou ambos os carros e poderia ter causado um incêndio grave. Os comissários aplicaram drive-through penalty a Grosjean, que já tinha histórico de acidentes naquela temporada, incluindo o Grande Acidente na primeira volta de Spa.',
    options: [
      { text: 'A FIA deveria aumentar o espaço no pit lane para evitar tais acidentes', isCorrect: false, advance: 0, penalty: 'Voltar ao início por fugir da responsabilidade do piloto', penaltyType: 'start' },
      { text: 'Grosjean deveria ter sido suspenso de várias corridas, pois seu histórico de acidentes demonstra risco constante', isCorrect: true, advance: 3, penalty: null, penaltyType: null },
      { text: 'Drive-through penalty foi suficiente, pois o acidente no pit lane é comum e não houve feridos', isCorrect: false, advance: 0, penalty: 'Voltar 2 casas por minimizar perigo', penaltyType: 'back2' },
      { text: 'Hamilton também compartilha responsabilidade por não prever a manobra de Grosjean', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por culpar a vítima', penaltyType: 'skip' },
    ],
  },
  {
    id: 24,
    title: 'Vettel - Colisão com Button na Turquia (2010)',
    scenario: 'No GP da Turquia de 2010, Sebastian Vettel (Red Bull) e Jenson Button (McLaren) colidiram na curva 8. Vettel tentou ultrapassar Button pelo lado de fora, mas não manteve a linha e os carros se tocaram. Vettel abandonou e Button continuou com danos. Os comissários consideraram que Vettel era o responsável pelo acidente e aplicaram drive-through penalty.',
    options: [
      { text: 'Vettel deveria ter sido desclassificado da corrida por causar um acidente evitável', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por punição excessiva', penaltyType: 'skip' },
      { text: 'A drive-through penalty foi justa, pois Vettel claramente errou na entrada da curva', isCorrect: true, advance: 2, penalty: null, penaltyType: null },
      { text: 'Button deveria ter dado mais espaço, pois sabia que Vettel vinha com mais velocidade', isCorrect: false, advance: 0, penalty: 'Voltar 1 casa por culpar a vítima', penaltyType: 'back1' },
      { text: 'Acidentes entre companheiros de equipe não deveriam ter punições esportivas', isCorrect: false, advance: 0, penalty: 'Voltar ao início por eliminar responsabilidade', penaltyType: 'start' },
    ],
  },
  {
    id: 25,
    title: 'Leclerc vs Norris - Mônaco (2024)',
    scenario: 'No GP de Mônaco de 2024, Charles Leclerc (Ferrari) e Lando Norris (McLaren) disputaram posições na reta do porto. Norris tentou ultrapassar Leclerc pelo lado de fora na curva Sainte Devote, mas Leclerc fechou a porta e os carros se tocaram. Leclerc, que liderava, manteve a posição, mas o carro de Norris teve danos no difusor. Os comissários não aplicaram punição.',
    options: [
      { text: 'Norris tentou uma ultrapassagem impossível em Mônaco e assumiu o risco', isCorrect: false, advance: 0, penalty: 'Voltar 1 casa por culpar a vítima', penaltyType: 'back1' },
      { text: 'A decisão dos comissários foi correta: ambos mantiveram trajetórias dentro dos limites', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por ignorar falta de espaço', penaltyType: 'skip' },
      { text: 'Mônaco é um circuito onde ultrapassagens são impossíveis, portanto não deveria haver punições por tentativas', isCorrect: false, advance: 0, penalty: 'Voltar ao início por eliminar regras de ultrapassagem', penaltyType: 'start' },
      { text: 'Leclerc deveria ter sido punido por não deixar espaço na entrada da curva', isCorrect: true, advance: 2, penalty: null, penaltyType: null },
    ],
  },
  {
    id: 26,
    title: 'Bottas - Pile-up na Hungria (2021)',
    scenario: 'No GP da Hungria de 2021, Valtteri Bottas (Mercedes) travou na primeira curva na primeira volta e colidiu com Max Verstappen (Red Bull), que por sua vez atingiu Sergio Perez e Daniel Ricciardo. O acidente eliminou vários carros e gerou uma revisão sobre a responsabilidade do piloto que inicia a cadeia de colisões. Bottas recebeu grid penalty de 5 posições.',
    options: [
      { text: 'Verstappen e os demais pilotos também poderiam ter sido mais cautelosos na primeira volta', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por culpar as vítimas', penaltyType: 'skip' },
      { text: 'Pile-ups na primeira volta são inevitáveis e não deveria haver punições por erros na chuva', isCorrect: false, advance: 0, penalty: 'Voltar ao início por normalizar conduta perigosa', penaltyType: 'start' },
      { text: 'Bottas deveria ter recebido punição muito mais severa, pois seu erro causou a eliminação de quatro carros', isCorrect: true, advance: 3, penalty: null, penaltyType: null },
      { text: 'Grid penalty de 5 posições foi suficiente, pois foi um acidente de primeira volta com chuva', isCorrect: false, advance: 0, penalty: 'Voltar 2 casas por punição branda', penaltyType: 'back2' },
    ],
  },
  {
    id: 27,
    title: 'Senna - Parado na Rascasse (1993)',
    scenario: 'No GP de Mônaco de 1993, Ayrton Senna (Williams) parou seu carro na curva Rascasse durante a classificação, bloqueando a volta rápida de Alain Prost (Williams). Senna alegou problemas mecânicos, mas os comissários desconfiaram que a parada foi proposital para impedir Prost de melhorar seu tempo. Senna foi punido com a última posição no grid.',
    options: [
      { text: 'Os comissários deveriam ter anulado toda a sessão de classificação por causa do incidente', isCorrect: false, advance: 0, penalty: 'Voltar ao início por punição excessiva', penaltyType: 'start' },
      { text: 'A punição foi justa: bloquear propositalmente a pista é uma forma de trapaça', isCorrect: true, advance: 2, penalty: null, penaltyType: null },
      { text: 'Senna só teve azar, pois problemas mecânicos são comuns em Mônaco', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por ignorar evidências', penaltyType: 'skip' },
      { text: 'Prost deveria ter esperado, pois Mônaco é um circuito onde erros são frequentes', isCorrect: false, advance: 0, penalty: 'Voltar 1 casa por culpar a vítima', penaltyType: 'back1' },
    ],
  },
  {
    id: 28,
    title: 'Button - Vitória na Chuva no Canadá (2011)',
    scenario: 'No GP do Canadá de 2011, a corrida foi suspensa por mais de 2 horas devido a chuva torrencial. Jenson Button (McLaren) estava na última posição, mas aproveitou estratégias ousadas e acidentes de rivais para avançar. Na última volta, Button ultrapassou Sebastian Vettel (Red Bull), que errou na entrada do pit lane, e venceu a corrida mais longa da história da F1. O caso gerou debate sobre estratégia vs. sorte.',
    options: [
      { text: 'A vitória de Button foi legítima: estratégia e adaptabilidade são qualidades essenciais de um campeão', isCorrect: true, advance: 2, penalty: null, penaltyType: null },
      { text: 'Vettel perdeu a vitória por erro próprio, e Button apenas se aproveitou da situação', isCorrect: false, advance: 0, penalty: 'Voltar 1 casa por desmerecer vitória', penaltyType: 'back1' },
      { text: 'A corrida deveria ter sido cancelada antes, pois as condições eram perigosas para todos os pilotos', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por questionar decisão dos organizadores', penaltyType: 'skip' },
      { text: 'A FIA deveria ter declarado resultado parcial, pois a corrida durou mais de 4 horas', isCorrect: false, advance: 0, penalty: 'Voltar ao início por eliminar resultado final', penaltyType: 'start' },
    ],
  },
  {
    id: 29,
    title: 'Prost - Acordo Informal entre Prost e Senna (1991)',
    scenario: 'No GP do Brasil de 1991, Alain Prost (Ferrari) e Ayrton Senna (Williams) chegaram a um acordo informal para manter as posições, evitando disputa arriscada. Prost liderou a corrida inteira sem pressão, e Senna manteve o segundo lugar. Torcedores brasileiros vaiaram o resultado, e a FIA investigou mas não encontrou evidências formais de combinação.',
    options: [
      { text: 'Os pilotos tinham direito de proteger seus carros e resultados, pois o campeonato é longo', isCorrect: false, advance: 0, penalty: 'Voltar 1 casa por aceitar combinação', penaltyType: 'back1' },
      { text: 'Sem evidências formais, a FIA não poderia punir nenhum dos pilotos', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por ignorar ética', penaltyType: 'skip' },
      { text: 'A torcida deveria respeitar as decisões estratégicas dos pilotos, mesmo quando não são populares', isCorrect: false, advance: 0, penalty: 'Voltar ao início por defender manipulação', penaltyType: 'start' },
      { text: 'Acordos informais entre rivais são trapaça e deveriam ser punidos pela FIA', isCorrect: true, advance: 3, penalty: null, penaltyType: null },
    ],
  },
  {
    id: 30,
    title: 'Verstappen - Defesa Agressiva no Brasil (2021)',
    scenario: 'No GP do Brasil de 2021, Max Verstappen (Red Bull) fez uma defesa extrema contra Lewis Hamilton (Mercedes) na curva 4, empurrando Hamilton para fora da pista. Os comissários não aplicaram punição na época, mas o caso gerou enorme controvérsia sobre o que constitui defesa aceitável. Hamilton declarou que Verstappen estava dirigindo de forma perigosa.',
    options: [
      { text: 'Hamilton deveria ter esperado um momento melhor para ultrapassar em vez de forçar na curva', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por culpar a vítima', penaltyType: 'skip' },
      { text: 'Disputas acirradas fazem parte da F1 e não deveriam ser julgadas pelos comissários', isCorrect: false, advance: 0, penalty: 'Voltar ao início por eliminar regulamentacao', penaltyType: 'start' },
      { text: 'Verstappen deveria ter sido punido, pois empurrar um rival para fora da pista é condução perigosa', isCorrect: true, advance: 3, penalty: null, penaltyType: null },
      { text: 'Os comissários acertaram ao não punir, pois ambos mantiveram trajetórias dentro dos limites', isCorrect: false, advance: 0, penalty: 'Voltar 2 casas por defender condução perigosa', penaltyType: 'back2' },
    ],
  },
  {
    id: 31,
    title: 'Hamilton vs Verstappen - Monza (2021)',
    scenario: 'No GP da Itália de 2021, Lewis Hamilton (Mercedes) e Max Verstappen (Red Bull) colidiram na chicane da Variante del Rettifilo. Verstappen tentou ultrapassar Hamilton pela entrada da curva, mas Hamilton manteve a linha e os carros se tocaram, eliminando ambos. Os comissários culparam Verstappen pelo acidente e aplicaram grid penalty de 3 posições.',
    options: [
      { text: 'A FIA deveria ter declarado sem vencedor, pois ambos causaram o acidente mutuamente', isCorrect: false, advance: 0, penalty: 'Voltar ao início por eliminar responsabilidade', penaltyType: 'start' },
      { text: 'A punição de Verstappen foi justa, pois ele era o piloto por trás e deveria ter sido mais cauteloso', isCorrect: true, advance: 2, penalty: null, penaltyType: null },
      { text: 'Hamilton também compartilha responsabilidade por não dar espaço na entrada da curva', isCorrect: false, advance: 0, penalty: 'Voltar 1 casa por dividir responsabilidade', penaltyType: 'back1' },
      { text: 'Grid penalty de 3 posições foi insuficiente, pois a colisão eliminou ambos os líderes do campeonato', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por punição branda', penaltyType: 'skip' },
    ],
  },
  {
    id: 32,
    title: 'Verstappen - Empurrando Russell no Brasil (2022)',
    scenario: 'No GP do Brasil de 2022, Max Verstappen (Red Bull) e George Russell (Mercedes) colidiram na curva 1 na primeira volta. Verstappen tentou defender a posição de forma agressiva e empurrou Russell para fora da pista, causando danos no carro do britânico. Os comissários aplicaram drive-through penalty a Verstappen, que já havia vencido o campeonato naquela temporada.',
    options: [
      { text: 'Verstappen deveria ter sido punido mais severamente, pois já era campeão e não tinha nada a perder', isCorrect: true, advance: 3, penalty: null, penaltyType: null },
      { text: 'Drive-through penalty foi suficiente, pois o acidente foi na primeira volta e não afetou o resultado final', isCorrect: false, advance: 0, penalty: 'Voltar 2 casas por punição branda', penaltyType: 'back2' },
      { text: 'Russell tentou uma ultrapassagem agressiva e assumiu o risco ao tentar pelo lado de fora', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por culpar a vítima', penaltyType: 'skip' },
      { text: 'A punição não deveria ser mais severa só porque Verstappen já era campeão', isCorrect: false, advance: 0, penalty: 'Voltar ao início por eliminar justiça', penaltyType: 'start' },
    ],
  },
  {
    id: 33,
    title: 'Stroll - Descaso com Bandeiras Azuis no Canadá (2019)',
    scenario: 'No GP do Canadá de 2019, Lance Stroll (Racing Point) ignorou várias bandeiras azuis durante a corrida, bloqueando pilotos mais rápidos por várias voltas. Os comissários aplicaram drive-through penalty, mas Stroll continuou ignorando as sinalizações. A FIA considerou que o descaso com bandeiras azuis coloca em risco a segurança de todos os pilotos na pista.',
    options: [
      { text: 'Drive-through penalty foi suficiente, pois Stroll não causou acidente direto', isCorrect: false, advance: 0, penalty: 'Voltar 2 casas por punição branda', penaltyType: 'back2' },
      { text: 'Stroll não viu as bandeiras, pois a visibilidade era limitada naquele circuito', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por aceitar desculpa fraca', penaltyType: 'skip' },
      { text: 'Bandeiras azuis deveriam ter penalidade automática, não depender dos comissários', isCorrect: false, advance: 0, penalty: 'Voltar ao início por fugir da responsabilidade', penaltyType: 'start' },
      { text: 'Stroll deveria ter sido desclassificado da corrida, pois ignorar bandeiras azuis é uma ofensa gravíssima', isCorrect: true, advance: 3, penalty: null, penaltyType: null },
    ],
  },
  {
    id: 34,
    title: 'Hamilton - Tensão no Paddock sobre Direitos Humanos (2021)',
    scenario: 'Durante a temporada de 2021, Lewis Hamilton usou seu traje e capacete para fazer campanha por direitos humanos em vários GPs controversos do calendário. A FIA emitiu uma advertência dizendo que as declarações políticas de pilotos não eram bem-vindas em eventos esportivos. Hamilton respondeu que a F1 tem responsabilidade sobre onde corre e que o silêncio é conivente.',
    options: [
      { text: 'Hamilton deveria ter mantido suas opiniões fora da F1, pois isso afeta patrocinadores e parceiros comerciais', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por priorizar comércio sobre ética', penaltyType: 'skip' },
      { text: 'A F1 deveria remover do calendário os GPs controversos em vez de censurar os pilotos', isCorrect: false, advance: 0, penalty: 'Voltar ao início por proposta impossível', penaltyType: 'start' },
      { text: 'Hamilton tinha razão: atletas de elite têm o dever de usar sua plataforma para causas humanitárias', isCorrect: true, advance: 2, penalty: null, penaltyType: null },
      { text: 'A FIA estava correta em advertir, pois eventos esportivos não devem ser palco de declarações políticas', isCorrect: false, advance: 0, penalty: 'Voltar 1 casa por censurar ativismo', penaltyType: 'back1' },
    ],
  },
  {
    id: 35,
    title: 'Verstappen - Limites de Pista em Las Vegas (2023)',
    scenario: 'No GP de Las Vegas de 2023, Max Verstappen (Red Bull) violou os limites de pista 47 vezes ao longo da corrida, mas só recebeu uma advertência. Charles Leclerc (Ferrari) reclamou publicamente que as decisões sobre limites de pista eram inconsistentes entre diferentes pilotos. A FIA reconheceu que o sistema de monitoramento precisava ser melhorado.',
    options: [
      { text: 'A FIA deveria remover completamente as restrições aos limites de pista', isCorrect: false, advance: 0, penalty: 'Voltar ao início por eliminar regulamento', penaltyType: 'start' },
      { text: 'Verstappen deveria ter recebido penalidades de tempo por cada violação, não apenas uma advertência', isCorrect: true, advance: 2, penalty: null, penaltyType: null },
      { text: 'A advertência foi suficiente, pois violações de limites são técnicas e não afetam a segurança', isCorrect: false, advance: 0, penalty: 'Voltar 1 casa por minimizar violações', penaltyType: 'back1' },
      { text: 'Todos os pilotos violam limites de pista, então não deveria haver punição para ninguém', isCorrect: false, advance: 0, penalty: 'Perder próxima rodada por normalizar violações', penaltyType: 'skip' },
    ],
  },
];

export const BOARD_SIZE = 10;
export const MAX_TEAMS = 11;
