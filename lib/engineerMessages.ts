import { getQuestionAt } from '../data/questions';

export type EngineerMessageCategory =
  | 'acerto_seguido'
  | 'acerto_primeiro'
  | 'recuperacao'
  | 'punicao_recente'
  | 'punicoes_multiplas'
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
  punicao_recente: [
    'Não desistam! Ainda temos corrida pela frente.',
    'Foi uma rodada difícil, mas seguimos juntos. Vamos reagir!',
    'Mantenham a calma. Ainda há muitas oportunidades na pista.',
  ],
  punicoes_multiplas: [
    'Foco, equipe! Dias difíceis acontecem, mas vamos virar esse jogo.',
    'Respirem fundo e confiem no plano. Ainda dá para recuperar.',
    'A corrida não acabou. Vamos aprender com essa rodada e seguir.',
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
  is_correct: boolean;
}

interface EngineerMessageRequest {
  player: EngineerPlayer;
  players: EngineerPlayer[];
  answers: EngineerAnswer[];
  questionIndex: number;
  questionOrder?: readonly number[] | null;
  boardSize: number;
  previousMessage?: string;
}

export interface EngineerMessage {
  category: EngineerMessageCategory;
  text: string;
}

function getAnswerPenalty(
  answer: EngineerAnswer | undefined,
  questionOrder?: readonly number[] | null,
) {
  if (!answer) return null;
  return getQuestionAt(answer.question_index, questionOrder)?.options[answer.selected_option]?.penaltyType ?? null;
}

export function hasLostTurnPenalty(
  answers: EngineerAnswer[],
  playerId: string,
  completedQuestionIndex: number,
  questionOrder?: readonly number[] | null,
) {
  const playerAnswers = answers.filter((answer) => answer.player_id === playerId);
  const completedAnswer = playerAnswers.find(
    (answer) => answer.question_index === completedQuestionIndex,
  );
  if (getAnswerPenalty(completedAnswer, questionOrder) === 'skip') return true;

  const previousAnswer = playerAnswers.find(
    (answer) => answer.question_index === completedQuestionIndex - 1,
  );
  return !completedAnswer && getAnswerPenalty(previousAnswer, questionOrder) === 'skip';
}

export function hasSkipAnswerForQuestion(
  answers: EngineerAnswer[],
  playerId: string,
  questionIndex: number,
  questionOrder?: readonly number[] | null,
) {
  const answer = answers.find(
    (candidate) => candidate.player_id === playerId && candidate.question_index === questionIndex,
  );
  return getAnswerPenalty(answer, questionOrder) === 'skip';
}

export function getEngineerMessage({
  player,
  players,
  answers,
  questionIndex,
  questionOrder,
  boardSize,
  previousMessage,
}: EngineerMessageRequest): EngineerMessage {
  const history = answers
    .filter((answer) => answer.player_id === player.id && answer.question_index <= questionIndex)
    .sort((first, second) => first.question_index - second.question_index);
  const answersByQuestion = new Map(history.map((answer) => [answer.question_index, answer]));
  const currentAnswer = answersByQuestion.get(questionIndex);
  const previousAnswer = answersByQuestion.get(questionIndex - 1);
  const currentPenalty = getAnswerPenalty(currentAnswer, questionOrder);

  let correctStreak = 0;
  for (let index = questionIndex; index >= 0; index -= 1) {
    if (!answersByQuestion.get(index)?.is_correct) break;
    correctStreak += 1;
  }

  let penaltyStreak = 0;
  for (let index = questionIndex; index >= 0; index -= 1) {
    const answer = answersByQuestion.get(index);
    if (!answer || !getAnswerPenalty(answer, questionOrder)) break;
    penaltyStreak += 1;
  }

  const opponents = players.filter((other) => other.id !== player.id);
  const uniquelyLeading = opponents.length > 0 && opponents.every((other) => player.position > other.position);
  const uniquelyLast = opponents.length > 0 && opponents.every((other) => player.position < other.position);
  const isOvertaking = currentAnswer?.is_correct && (() => {
    const option = getQuestionAt(questionIndex, questionOrder)?.options[currentAnswer.selected_option];
    if (!option?.advance) return false;
    const previousPosition = Math.max(0, player.position - option.advance);
    return opponents.some(
      (other) => other.position > previousPosition && other.position <= player.position,
    );
  })();
  const isCloseFight = opponents.some((other) =>
    Math.abs(other.position - player.position) <= 1 && other.position < boardSize,
  );

  let category: EngineerMessageCategory = 'neutro';
  if (correctStreak >= 3) category = 'rodada_perfeita';
  else if (correctStreak >= 2) category = 'acerto_seguido';
  else if (questionIndex === 0 && currentAnswer?.is_correct) category = 'acerto_primeiro';
  else if (currentAnswer?.is_correct && previousAnswer && !previousAnswer.is_correct) category = 'recuperacao';
  else if (currentPenalty && currentPenalty !== 'skip' && penaltyStreak >= 2) category = 'punicoes_multiplas';
  else if (currentPenalty && currentPenalty !== 'skip') category = 'punicao_recente';
  else if (isOvertaking) category = 'ultrapassagem';
  else if (uniquelyLast) category = 'ultimo_lugar';
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