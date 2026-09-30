import {
  applyScore,
  raceTarget,
  rankCorrectAnswersForQuestion,
  scoreForQuestion,
  type ScorableOption,
  type ScorableQuestion,
  type TimedAnswer,
} from './scoring';

// Her games carry question_order, an integer[] of dealt question ids shuffled
// per game, so question i of the race is allQuestions[questionOrder[i]], never
// the global array by position. Scoring against the global array would silently
// score the wrong question.
export interface IdentifiableQuestion {
  id: number;
  options: ReadonlyArray<{ isCorrect: boolean; advance: number }>;
}

export function dealtQuestions(
  questionOrder: readonly number[] | null | undefined,
  allQuestions: readonly IdentifiableQuestion[],
): ScorableQuestion[] {
  if (!questionOrder) return [...allQuestions];
  return questionOrder.map((questionId) => {
    const question = allQuestions.find((candidate) => candidate.id === questionId);
    if (!question) {
      throw new Error(`Question ${questionId} from the game's question_order was not found.`);
    }
    return question;
  });
}

// The finish line is the perfect-race ceiling for the questions this game
// actually dealt: for each dealt question, its largest correct advance plus the
// top speed bonus. Capping at the dealt subset is what keeps a shorter dealt
// race from inheriting the larger whole-set ceiling.
export function raceFinishLine(dealt: readonly ScorableQuestion[]): number {
  return raceTarget(dealt, dealt.length);
}

export function finishLineForOrder(
  questionOrder: readonly number[] | null | undefined,
  allQuestions: readonly IdentifiableQuestion[],
): number {
  return raceFinishLine(dealtQuestions(questionOrder, allQuestions));
}

// The single finished predicate every screen uses. A position of exactly the
// target counts as a finish, so the comparison is >= and never >.
export function hasReachedFinishLine(position: number, finishLine: number): boolean {
  return position >= finishLine;
}

export interface ScorablePlayer {
  id: string;
  position: number;
  skipped_turn: boolean;
}

export interface ScorableAnswer extends TimedAnswer {
  selected_option: number;
}

export interface ScoreUpdate {
  id: string;
  position: number;
  skipped_turn: boolean;
}

// The exact per-player payload for POST /players/batch-update after a reveal.
// A correct option earns its advance plus the speed bonus ranked among that
// question's correct answers by created_at; a wrong option takes only its
// penalty. Scores floor at zero and a skip costs a turn and never a point.
// Nobody is exempted from scoring by position: the finish line is a display
// and classification value, never a gate on scoring.
export function scoreReveal(
  question: readonly ScorableOption[],
  players: readonly ScorablePlayer[],
  answers: readonly ScorableAnswer[],
  questionIndex: number,
): ScoreUpdate[] {
  const ranks = rankCorrectAnswersForQuestion(answers, questionIndex);
  const answerByPlayer = new Map(
    answers
      .filter((answer) => answer.question_index === questionIndex)
      .map((answer) => [answer.player_id, answer]),
  );
  return players.map((player) => {
    if (player.skipped_turn) {
      return { id: player.id, position: player.position, skipped_turn: player.skipped_turn };
    }
    const answer = answerByPlayer.get(player.id);
    if (!answer) {
      throw new Error('Cannot reveal an answer until every player has submitted one.');
    }
    const option = question[answer.selected_option];
    if (!option) {
      throw new Error(`Invalid answer option for player ${player.id}.`);
    }
    const speedRank = ranks.get(player.id) ?? 0;
    return {
      id: player.id,
      position: applyScore(player.position, scoreForQuestion(option, speedRank)),
      skipped_turn: option.penaltyType === 'skip' ? true : player.skipped_turn,
    };
  });
}