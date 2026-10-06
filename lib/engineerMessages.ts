export type EngineerMessageCategory =
  | 'acerto_seguido'
  | 'acerto_primeiro'
  | 'recuperacao'
  | 'resposta_rapida'
  | 'resposta_errada'
  | 'ficou_para_tras'
  | 'ultimo_lugar'
  | 'lideranca'
  | 'ultrapassagem'
  | 'disputa_acirrada'
  | 'rodada_perfeita'
  | 'neutro';

export const ENGINEER_MESSAGE_BANK: Record<EngineerMessageCategory, readonly string[]> = {
  acerto_seguido: [
    'Excelente trabalho, equipe! Mantenham esse ritmo!',
    'Mais um acerto! A consistência está fazendo a diferença.',
    'Boa sequência! Continuem focados que a pista é nossa.',
  ],
  acerto_primeiro: [
    'Boa largada! Continuem focados.',
    'Primeiro acerto na conta. Ótimo começo de corrida!',
    'É assim que se começa! Vamos construir uma grande corrida.',
  ],
  recuperacao: [
    'Isso aí! Estamos voltando para a briga!',
    'Boa recuperação, equipe. Cabeça erguida e acelerem!',
    'Resposta certeira! Já estamos recuperando terreno.',
  ],
  resposta_rapida: [
    'Resposta relâmpago e correta! Excelente reflexo!',
    'Vocês foram os mais rápidos. Grande largada nesta rodada!',
    'Precisão e velocidade! Avanço importante para a equipe.',
  ],
  resposta_errada: [
    'Não foi dessa vez. Respirem e foquem na próxima pergunta!',
    'A resposta escapou, mas a corrida continua. Vamos tentar de novo!',
    'Cabeça erguida, equipe. Cada pergunta é uma nova chance!',
  ],
  ficou_para_tras: [
    'A resposta veio mais tarde, mas cada casa conta. Vamos acelerar!',
    'Seguimos na disputa. Uma resposta rápida pode mudar tudo!',
    'Continuem atentos: a próxima oportunidade pode render posições.',
  ],
  ultimo_lugar: [
    'Não importa a posição agora, importa não desistir. Vamos com tudo!',
    'Ainda há pista pela frente. Vamos buscar cada posição!',
    'Foco na próxima resposta. Toda recuperação começa assim.',
  ],
  lideranca: [
    'Vocês estão no topo! Continuem assim e ninguém nos alcança.',
    'Liderança conquistada. Mantenham a concentração!',
    'Que corrida, equipe! Defendam essa posição com inteligência.',
  ],
  ultrapassagem: [
    'Que ultrapassagem! Isso é que é garra!',
    'Passaram mais um! Bela leitura da corrida.',
    'Manobra perfeita! Seguimos avançando pelo pelotão.',
  ],
  disputa_acirrada: [
    'Estamos colados no adversário. Um acerto e passamos!',
    'Disputa apertada. Olhos na pista e vamos buscar essa posição.',
    'É roda a roda! Mantenham a calma e aproveitem a oportunidade.',
  ],
  rodada_perfeita: [
    'Rodada perfeita! Isso é trabalho de campeão!',
    'Sequência impecável! A equipe está em sintonia total.',
    'Perfeição na pista. Continuem nesse ritmo extraordinário!',
  ],
  neutro: [
    'Bom trabalho, equipe. Sigam focados.',
    'Estamos acompanhando. Confiem no plano e boa sorte!',
    'Cada rodada conta. Vamos em frente, equipe!',
  ],
};

export interface EngineerPlayer {
  id: string;
  position: number;
}

export interface EngineerAnswer {
  player_id: string;
  question_index: number;
  selected_option: number;
  // Nulo quando o servidor ainda mascara o veredito; a mensagem vem do snapshot revelado.
  is_correct: boolean | null;
  response_time_ms: number | null;
  created_at?: string;
}

interface EngineerMessageRequest {
  player: EngineerPlayer;
  players: EngineerPlayer[];
  answers: EngineerAnswer[];
  questionIndex: number;
  boardSize: number;
  previousMessage?: string;
}

export interface EngineerMessage {
  category: EngineerMessageCategory;
  text: string;
}

function compareResponseSpeed(first: EngineerAnswer, second: EngineerAnswer) {
  const firstTime = first.response_time_ms ?? Number.POSITIVE_INFINITY;
  const secondTime = second.response_time_ms ?? Number.POSITIVE_INFINITY;
  if (firstTime !== secondTime) return firstTime < secondTime ? -1 : 1;

  const firstTimestamp = first.created_at ? Date.parse(first.created_at) : Number.POSITIVE_INFINITY;
  const secondTimestamp = second.created_at ? Date.parse(second.created_at) : Number.POSITIVE_INFINITY;
  if (Number.isFinite(firstTimestamp - secondTimestamp) && firstTimestamp !== secondTimestamp) {
    return firstTimestamp < secondTimestamp ? -1 : 1;
  }
  return first.player_id.localeCompare(second.player_id);
}

export function getEngineerMessage({
  player,
  players,
  answers,
  questionIndex,
  boardSize,
  previousMessage,
}: EngineerMessageRequest): EngineerMessage {
  const history = answers
    .filter((answer) => answer.player_id === player.id && answer.question_index <= questionIndex)
    .sort((first, second) => first.question_index - second.question_index);
  const answersByQuestion = new Map(history.map((answer) => [answer.question_index, answer]));
  const currentAnswer = answersByQuestion.get(questionIndex);
  const previousAnswer = answersByQuestion.get(questionIndex - 1);
  const correctAnswers = answers
    .filter((answer) => answer.question_index === questionIndex && answer.is_correct)
    .sort(compareResponseSpeed);
  const responseRank = currentAnswer?.is_correct
    ? correctAnswers.findIndex((answer) => answer.player_id === player.id) + 1
    : null;

  let correctStreak = 0;
  for (let index = questionIndex; index >= 0; index -= 1) {
    if (!answersByQuestion.get(index)?.is_correct) break;
    correctStreak += 1;
  }

  const opponents = players.filter((other) => other.id !== player.id);
  const uniquelyLeading = opponents.length > 0 && opponents.every((other) => player.position > other.position);
  const uniquelyLast = opponents.length > 0 && opponents.every((other) => player.position < other.position);
  const advancement = responseRank === null ? 0 : Math.max(1, 5 - responseRank);
  const isOvertaking = currentAnswer?.is_correct && (() => {
    const previousPosition = Math.max(0, player.position - advancement);
    return opponents.some(
      (other) => other.position > previousPosition && other.position <= player.position,
    );
  })();
  const isCloseFight = opponents.some((other) =>
    Math.abs(other.position - player.position) <= 1 && other.position < boardSize,
  );

  let category: EngineerMessageCategory = 'neutro';
  if (currentAnswer && !currentAnswer.is_correct && uniquelyLast) category = 'ultimo_lugar';
  else if (currentAnswer && !currentAnswer.is_correct) category = 'resposta_errada';
  else if (correctStreak >= 3) category = 'rodada_perfeita';
  else if (responseRank === 1) category = 'resposta_rapida';
  else if (currentAnswer?.is_correct && previousAnswer && !previousAnswer.is_correct) category = 'recuperacao';
  else if (correctStreak >= 2) category = 'acerto_seguido';
  else if (questionIndex === 0 && currentAnswer?.is_correct) category = 'acerto_primeiro';
  else if (isOvertaking) category = 'ultrapassagem';
  else if (uniquelyLast) category = 'ultimo_lugar';
  else if (responseRank !== null && responseRank >= 4) category = 'ficou_para_tras';
  else if (uniquelyLeading) category = 'lideranca';
  else if (isCloseFight) category = 'disputa_acirrada';

  const phrases = ENGINEER_MESSAGE_BANK[category];
  const alternatives = phrases.filter((phrase) => phrase !== previousMessage);
  const choices = alternatives.length > 0 ? alternatives : phrases;

  return {
    category,
    text: choices[Math.floor(Math.random() * choices.length)],
  };
}
