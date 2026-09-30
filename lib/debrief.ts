import { applyScore, rankCorrectAnswersForQuestion, scoreForQuestion, type ScorableOption, type TimedAnswer } from './scoring';

export interface AnswerLike extends TimedAnswer {
  selected_option: number;
}

export interface PlayerLike {
  id: string;
  position: number;
  team_name: string;
}

// scoring.ts's ScorableQuestion keeps no penaltyType, but a debrief must hand
// every option to scoreForQuestion, which needs it. data/questions.tsx rows
// carry it, so this is the debrief's faithful question contract.
export interface ScorableQuestion {
  options: readonly ScorableOption[];
}

export interface QuestionDelta {
  playerId: string;
  isCorrect: boolean;
  speedRank: number;
  delta: number;
  scoreBefore: number;
  scoreAfter: number;
}

export interface OvertakeReport {
  playerId: string;
  placesGained: number;
  passedNames: string[];
  passedByName: string[];
}

// Replays questions 0..index-1 through the same scoreForQuestion + applyScore
// pair the reveal uses, so scoreBefore is exact even where the zero floor made
// `position - delta` unrecoverable. A missing answer is a skipped turn.
export function scoresBeforeQuestion(
  answers: readonly AnswerLike[],
  players: readonly PlayerLike[],
  questions: readonly ScorableQuestion[],
  questionIndex: number,
): Map<string, number> {
  const scores = new Map<string, number>(players.map((player) => [player.id, 0]));
  for (let index = 0; index < questionIndex; index += 1) {
    foldQuestion(scores, answers, players, questions, index);
  }
  return scores;
}

function foldQuestion(
  scores: Map<string, number>,
  answers: readonly AnswerLike[],
  players: readonly PlayerLike[],
  questions: readonly ScorableQuestion[],
  questionIndex: number,
): void {
  const question = questions[questionIndex];
  if (!question) return;
  const ranks = rankCorrectAnswersForQuestion(answers, questionIndex);
  const answerByPlayer = byPlayer(answers, questionIndex);
  for (const player of players) {
    const answer = answerByPlayer.get(player.id);
    if (!answer) continue;
    const option = question.options[answer.selected_option];
    if (!option) continue;
    const delta = scoreForQuestion(option, ranks.get(player.id) ?? 0);
    scores.set(player.id, applyScore(scores.get(player.id) ?? 0, delta));
  }
}

export function questionDeltas(
  answers: readonly AnswerLike[],
  players: readonly PlayerLike[],
  questions: readonly ScorableQuestion[],
  questionIndex: number,
): Map<string, QuestionDelta> {
  const before = scoresBeforeQuestion(answers, players, questions, questionIndex);
  const question = questions[questionIndex];
  const ranks = rankCorrectAnswersForQuestion(answers, questionIndex);
  const answerByPlayer = byPlayer(answers, questionIndex);

  const deltas = new Map<string, QuestionDelta>();
  for (const player of players) {
    const scoreBefore = before.get(player.id) ?? 0;
    const answer = answerByPlayer.get(player.id);
    const option = answer ? question?.options[answer.selected_option] : undefined;
    const speedRank = answer ? (ranks.get(player.id) ?? 0) : 0;
    const delta = option ? scoreForQuestion(option, speedRank) : 0;
    deltas.set(player.id, {
      playerId: player.id, isCorrect: answer ? answer.is_correct : false, speedRank,
      delta, scoreBefore,
      scoreAfter: applyScore(scoreBefore, delta),
    });
  }
  return deltas;
}

export function overtakeReport(
  deltas: ReadonlyMap<string, QuestionDelta>,
  players: readonly PlayerLike[],
): Map<string, OvertakeReport> {
  const before = positionsByScore(players, deltas, (id) => deltas.get(id)?.scoreBefore ?? 0);
  const after = positionsByScore(players, deltas, (id) => deltas.get(id)?.scoreAfter ?? 0);
  return new Map(players.map((player) => [player.id, overtakes(player, players, before, after)]));
}

function overtakes(
  player: PlayerLike,
  players: readonly PlayerLike[],
  before: ReadonlyMap<string, number>,
  after: ReadonlyMap<string, number>,
): OvertakeReport {
  const positionBefore = before.get(player.id) ?? players.length;
  const positionAfter = after.get(player.id) ?? players.length;
  const passedNames: string[] = [];
  const passedByName: string[] = [];
  for (const other of players) {
    if (other.id === player.id) continue;
    const otherBefore = before.get(other.id) ?? Number.POSITIVE_INFINITY;
    const otherAfter = after.get(other.id) ?? Number.POSITIVE_INFINITY;
    if (otherBefore < positionBefore && otherAfter > positionAfter) passedNames.push(other.team_name);
    if (otherBefore > positionBefore && otherAfter < positionAfter) passedByName.push(other.team_name);
  }
  return {
    playerId: player.id, placesGained: positionBefore - positionAfter,
    passedNames: passedNames.sort(), passedByName: passedByName.sort(),
  };
}

function positionsByScore(
  players: readonly PlayerLike[],
  deltas: ReadonlyMap<string, QuestionDelta>,
  scoreFor: (playerId: string) => number,
): Map<string, number> {
  const ordered = [...players].sort((a, b) => {
    const difference = scoreFor(b.id) - scoreFor(a.id);
    if (difference !== 0) return difference;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return new Map(ordered.map((player, index) => [player.id, index + 1]));
}

function byPlayer(answers: readonly AnswerLike[], questionIndex: number): Map<string, AnswerLike> {
  return new Map(
    answers
      .filter((answer) => answer.question_index === questionIndex)
      .map((answer) => [answer.player_id, answer]),
  );
}