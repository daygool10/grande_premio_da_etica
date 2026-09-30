export type PenaltyType = 'skip' | 'back1' | 'back2' | 'start' | null;

export interface ScorableOption {
  isCorrect: boolean;
  advance: number;
  penaltyType: PenaltyType;
}

// Rank 1 -> 3 points, rank 2 -> 2, rank 3 -> 1, rank 4 and beyond -> 0.
// Indexed by rank - 1 so SPEED_BONUS_BY_RANK[0] is the prize for being fastest.
// The trailing 0 is deliberate: it lets the lookup clamp harmlessly for any rank
// past the third place, instead of falling off the end of the array.
export const SPEED_BONUS_BY_RANK: readonly number[] = [3, 2, 1, 0];

export function speedBonusForRank(rank: number): number {
  if (rank < 1) return 0;
  return SPEED_BONUS_BY_RANK[Math.min(rank, SPEED_BONUS_BY_RANK.length) - 1];
}

// skip costs a turn, not points, so it maps to 0 here; the turn is applied by the
// game loop, not by this scoring core. start is the harshest non-skip penalty.
export const PENALTY_SCORE_EFFECTS: Record<'skip' | 'back1' | 'back2' | 'start', number> = {
  skip: 0,
  back1: -1,
  back2: -2,
  start: -3,
};

export function penaltyScoreEffect(penaltyType: PenaltyType): number {
  if (penaltyType === null) return 0;
  return PENALTY_SCORE_EFFECTS[penaltyType];
}

// A correct option earns its advance plus the speed bonus; a wrong option never
// earns a bonus, so its advance is irrelevant and only the penalty applies.
export function scoreForQuestion(option: ScorableOption, speedRank: number): number {
  if (option.isCorrect) {
    return option.advance + speedBonusForRank(speedRank);
  }
  return penaltyScoreEffect(option.penaltyType);
}

// A player can never end a question with a negative total, so this floors the
// result at zero instead of letting repeated penalties drive the score below 0.
export function applyScore(currentScore: number, delta: number): number {
  return Math.max(0, currentScore + delta);
}

export interface TimedAnswer {
  player_id: string;
  question_index: number;
  is_correct: boolean;
  created_at?: string;
}

// Ranks only correct answers for the given question. Missing or unparseable
// timestamps are treated as "infinitely late" so they sort after every answer
// with a usable timestamp (the game never wants a late ringer to gain a rank).
// Equal timestamps tie-break on player_id so the result is independent of the
// order rows arrive in from the database.
export function rankCorrectAnswersForQuestion(
  answers: readonly TimedAnswer[],
  questionIndex: number,
): Map<string, number> {
  const correctAnswers = answers
    .filter((answer) => answer.question_index === questionIndex && answer.is_correct)
    .map((answer, inputIndex) => ({ answer, inputIndex }));

  correctAnswers.sort((a, b) => {
    const aTime = parseCreatedAt(a.answer.created_at);
    const bTime = parseCreatedAt(b.answer.created_at);
    if (aTime !== bTime) return aTime - bTime;
    if (a.answer.player_id !== b.answer.player_id) {
      return a.answer.player_id < b.answer.player_id ? -1 : 1;
    }
    // Identical player row twice is malformed input; fall back to input order so
    // the sort stays stable and deterministic.
    return a.inputIndex - b.inputIndex;
  });

  return new Map(correctAnswers.map(({ answer }, rank) => [answer.player_id, rank + 1]));
}

function parseCreatedAt(value: string | undefined): number {
  if (value === undefined) return Infinity;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Infinity : timestamp;
}

// The tiebreak for equal finish scores is "who answered correctly fastest", so a
// player's total is the sum of every per-question rank they earned. Folding the
// per-question ranks through rankCorrectAnswersForQuestion keeps one ranking rule.
export function accumulateSpeedRanks(answers: readonly TimedAnswer[]): Map<string, number> {
  const totals = new Map<string, number>();
  const questionIndices = Array.from(new Set(answers.map((answer) => answer.question_index)));
  for (const questionIndex of questionIndices) {
    const ranks = rankCorrectAnswersForQuestion(answers, questionIndex);
    for (const [playerId, rank] of ranks) {
      totals.set(playerId, (totals.get(playerId) ?? 0) + rank);
    }
  }
  return totals;
}

export interface ScorableQuestion {
  options: ReadonlyArray<{ isCorrect: boolean; advance: number }>;
}

// Every question is worth at most (its largest correct advance + the top speed
// bonus), so the line is the maximum any player could reach; a perfect run lands
// exactly on it. Capping the loop at questions.length guards against asking for a
// longer race than the question set provides.
export function raceTarget(questions: readonly ScorableQuestion[], questionCount: number): number {
  const count = Math.min(Math.max(0, questionCount), questions.length);
  let target = 0;
  for (let i = 0; i < count; i += 1) {
    target += largestCorrectAdvance(questions[i]) + SPEED_BONUS_BY_RANK[0];
  }
  return target;
}

function largestCorrectAdvance(question: ScorableQuestion): number {
  return question.options.reduce((largest, option) => {
    if (option.isCorrect && option.advance > largest) return option.advance;
    return largest;
  }, 0);
}

// Final classification: score desc, then speed rank asc (lower total = faster over
// the whole race), then original input order for a fully deterministic result.
// Mapping through entries keeps the input array untouched.
export function rankPlayers<T extends { id: string }>(
  players: readonly T[],
  scores: ReadonlyMap<string, number>,
  speedRanks: ReadonlyMap<string, number>,
): T[] {
  return players
    .map((player, originalIndex) => ({ player, originalIndex }))
    .sort((a, b) => {
      const scoreDifference = (scores.get(b.player.id) ?? 0) - (scores.get(a.player.id) ?? 0);
      if (scoreDifference !== 0) return scoreDifference;
      const speedDifference = (speedRanks.get(a.player.id) ?? 0) - (speedRanks.get(b.player.id) ?? 0);
      if (speedDifference !== 0) return speedDifference;
      return a.originalIndex - b.originalIndex;
    })
    .map((entry) => entry.player);
}