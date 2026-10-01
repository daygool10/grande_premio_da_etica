// One implementation of the scoring and race rules shared by the browser client
// and the Express server. This module imports nothing, so importing it from a
// browser can never pull express or pg into the bundle, and the server runs the
// exact same rules instead of a drifted duplicate.

/**
 * @typedef {'skip' | 'back1' | 'back2' | 'start' | null} PenaltyType
 */

/**
 * @typedef {Object} ScorableOption
 * @property {boolean} isCorrect
 * @property {number} advance
 * @property {PenaltyType} penaltyType
 */

// Rank 1 -> 3 points, rank 2 -> 2, rank 3 -> 1, rank 4 and beyond -> 0.
// Indexed by rank - 1 so SPEED_BONUS_BY_RANK[0] is the prize for being fastest.
// The trailing 0 is deliberate: it lets the lookup clamp harmlessly for any rank
// past the third place, instead of falling off the end of the array.
export const SPEED_BONUS_BY_RANK = [3, 2, 1, 0];

/**
 * @param {number} rank
 * @returns {number}
 */
export function speedBonusForRank(rank) {
  if (rank < 1) return 0;
  return SPEED_BONUS_BY_RANK[Math.min(rank, SPEED_BONUS_BY_RANK.length) - 1];
}

// skip costs a turn, not points, so it maps to 0 here; the turn is applied by the
// game loop, not by this scoring core. start is the harshest non-skip penalty.
export const PENALTY_SCORE_EFFECTS = { skip: 0, back1: -1, back2: -2, start: -3 };

/**
 * @param {PenaltyType} penaltyType
 * @returns {number}
 */
export function penaltyScoreEffect(penaltyType) {
  if (penaltyType === null) return 0;
  return PENALTY_SCORE_EFFECTS[penaltyType];
}

// A correct option earns its advance plus the speed bonus; a wrong option never
// earns a bonus, so its advance is irrelevant and only the penalty applies.
/**
 * @param {ScorableOption} option
 * @param {number} speedRank
 * @returns {number}
 */
export function scoreForQuestion(option, speedRank) {
  if (option.isCorrect) {
    return option.advance + speedBonusForRank(speedRank);
  }
  return penaltyScoreEffect(option.penaltyType);
}

// A player can never end a question with a negative total, so this floors the
// result at zero instead of letting repeated penalties drive the score below 0.
/**
 * @param {number} currentScore
 * @param {number} delta
 * @returns {number}
 */
export function applyScore(currentScore, delta) {
  return Math.max(0, currentScore + delta);
}

/**
 * @typedef {Object} TimedAnswer
 * @property {string} player_id
 * @property {number} question_index
 * @property {boolean} is_correct
 * @property {string} [created_at]
 */

// Ranks only correct answers for the given question. Missing or unparseable
// timestamps are treated as "infinitely late" so they sort after every answer
// with a usable timestamp (the game never wants a late ringer to gain a rank).
// Equal timestamps tie-break on player_id so the result is independent of the
// order rows arrive in from the database.
/**
 * @param {readonly TimedAnswer[]} answers
 * @param {number} questionIndex
 * @returns {Map<string, number>}
 */
export function rankCorrectAnswersForQuestion(answers, questionIndex) {
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

function parseCreatedAt(value) {
  if (value === undefined) return Infinity;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Infinity : timestamp;
}

// The tiebreak for equal finish scores is "who answered correctly fastest", so a
// player's total is the sum of every per-question rank they earned. Folding the
// per-question ranks through rankCorrectAnswersForQuestion keeps one ranking rule.
/**
 * @param {readonly TimedAnswer[]} answers
 * @returns {Map<string, number>}
 */
export function accumulateSpeedRanks(answers) {
  const totals = new Map();
  const questionIndices = Array.from(new Set(answers.map((answer) => answer.question_index)));
  for (const questionIndex of questionIndices) {
    const ranks = rankCorrectAnswersForQuestion(answers, questionIndex);
    for (const [playerId, rank] of ranks) {
      totals.set(playerId, (totals.get(playerId) ?? 0) + rank);
    }
  }
  return totals;
}

/**
 * @typedef {Object} ScorableQuestion
 * @property {ReadonlyArray<{ isCorrect: boolean; advance: number }>} options
 */

// Every question is worth at most (its largest correct advance + the top speed
// bonus), so the line is the maximum any player could reach; a perfect run lands
// exactly on it. Capping the loop at questions.length guards against asking for a
// longer race than the question set provides.
/**
 * @param {readonly ScorableQuestion[]} questions
 * @param {number} questionCount
 * @returns {number}
 */
export function raceTarget(questions, questionCount) {
  const count = Math.min(Math.max(0, questionCount), questions.length);
  let target = 0;
  for (let i = 0; i < count; i += 1) {
    target += largestCorrectAdvance(questions[i]) + SPEED_BONUS_BY_RANK[0];
  }
  return target;
}

function largestCorrectAdvance(question) {
  return question.options.reduce((largest, option) => {
    if (option.isCorrect && option.advance > largest) return option.advance;
    return largest;
  }, 0);
}

// Final classification: score desc, then speed rank asc (lower total = faster over
// the whole race), then original input order for a fully deterministic result.
// Mapping through entries keeps the input array untouched.
/**
 * @template {{ id: string }} T
 * @param {readonly T[]} players
 * @param {ReadonlyMap<string, number>} scores
 * @param {ReadonlyMap<string, number>} speedRanks
 * @returns {T[]}
 */
export function rankPlayers(players, scores, speedRanks) {
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

/**
 * @typedef {Object} IdentifiableQuestion
 * @property {number} id
 * @property {ReadonlyArray<{ isCorrect: boolean; advance: number }>} options
 */

// Her games carry question_order, an integer[] of dealt question ids shuffled
// per game, so question i of the race is allQuestions[questionOrder[i]], never
// the global array by position. Scoring against the global array would silently
// score the wrong question.
/**
 * @param {readonly number[] | null | undefined} questionOrder
 * @param {readonly IdentifiableQuestion[]} allQuestions
 * @returns {ScorableQuestion[]}
 */
export function dealtQuestions(questionOrder, allQuestions) {
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
/**
 * @param {readonly ScorableQuestion[]} dealt
 * @returns {number}
 */
export function raceFinishLine(dealt) {
  return raceTarget(dealt, dealt.length);
}

/**
 * @param {readonly number[] | null | undefined} questionOrder
 * @param {readonly IdentifiableQuestion[]} allQuestions
 * @returns {number}
 */
export function finishLineForOrder(questionOrder, allQuestions) {
  return raceFinishLine(dealtQuestions(questionOrder, allQuestions));
}

// The single finished predicate every screen uses. A position of exactly the
// target counts as a finish, so the comparison is >= and never >.
/**
 * @param {number} position
 * @param {number} finishLine
 * @returns {boolean}
 */
export function hasReachedFinishLine(position, finishLine) {
  return position >= finishLine;
}

/**
 * @typedef {Object} ScorablePlayer
 * @property {string} id
 * @property {number} position
 * @property {boolean} skipped_turn
 */

/**
 * @typedef {TimedAnswer & { selected_option: number }} ScorableAnswer
 */

/**
 * @typedef {Object} ScoreUpdate
 * @property {string} id
 * @property {number} position
 * @property {boolean} skipped_turn
 */

// The exact per-player payload for POST /players/batch-update after a reveal.
// A correct option earns its advance plus the speed bonus ranked among that
// question's correct answers by created_at; a wrong option takes only its
// penalty. Scores floor at zero and a skip costs a turn and never a point.
// Nobody is exempted from scoring by position: the finish line is a display
// and classification value, never a gate on scoring.
/**
 * @param {readonly ScorableOption[]} question
 * @param {readonly ScorablePlayer[]} players
 * @param {readonly ScorableAnswer[]} answers
 * @param {number} questionIndex
 * @returns {ScoreUpdate[]}
 */
export function scoreReveal(question, players, answers, questionIndex) {
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