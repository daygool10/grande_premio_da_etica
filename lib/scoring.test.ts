import { describe, expect, it } from 'vitest';
import {
  PENALTY_SCORE_EFFECTS,
  SPEED_BONUS_BY_RANK,
  accumulateSpeedRanks,
  applyScore,
  penaltyScoreEffect,
  raceTarget,
  rankCorrectAnswersForQuestion,
  rankPlayers,
  scoreForQuestion,
  speedBonusForRank,
  type ScorableOption,
  type ScorableQuestion,
  type TimedAnswer,
} from './scoring';

const answer = (
  player_id: string,
  question_index: number,
  is_correct: boolean,
  created_at?: string,
): TimedAnswer => ({ player_id, question_index, is_correct, created_at });

// One correct option carrying `advance`; wrong options use advance 0 so the
// distribution stays comparable to the real question set in data/questions.tsx.
const questionAdvancing = (advance: number): ScorableQuestion => ({
  options: [
    { isCorrect: false, advance: 0 },
    { isCorrect: true, advance },
    { isCorrect: false, advance: 0 },
  ],
});

// Real distribution and order from data/questions.tsx: 14 questions advance 2,
// 20 advance 3, one advance 4 (perfect-race sum 92), for 35 questions total.
const REAL_ADVANCES = [
  3, 4, 2, 3, 3, 3, 2, 3, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 2, 3, 2, 3, 2, 2, 3, 2, 2, 3, 3, 2, 3, 3, 2, 2,
] as const;

const realRace: ScorableQuestion[] = REAL_ADVANCES.map(questionAdvancing);

describe('speedBonusForRank', () => {
  it('awards 3, 2 and 1 for ranks 1, 2 and 3', () => {
    expect(SPEED_BONUS_BY_RANK).toEqual([3, 2, 1, 0]);
    expect(speedBonusForRank(1)).toBe(3);
    expect(speedBonusForRank(2)).toBe(2);
    expect(speedBonusForRank(3)).toBe(1);
  });

  it('awards 0 for rank 0, rank 4, large ranks and negative ranks', () => {
    expect(speedBonusForRank(0)).toBe(0);
    expect(speedBonusForRank(4)).toBe(0);
    expect(speedBonusForRank(99)).toBe(0);
    expect(speedBonusForRank(-1)).toBe(0);
    expect(speedBonusForRank(-7)).toBe(0);
  });
});

describe('scoreForQuestion', () => {
  it('adds the speed bonus only for a correct option', () => {
    const correct: ScorableOption = { isCorrect: true, advance: 3, penaltyType: null };
    expect(scoreForQuestion(correct, 1)).toBe(6);
    expect(scoreForQuestion(correct, 2)).toBe(5);
    expect(scoreForQuestion(correct, 99)).toBe(3);
  });

  it('scores a wrong option by its penalty and never a bonus', () => {
    const back1: ScorableOption = { isCorrect: false, advance: 0, penaltyType: 'back1' };
    const skip: ScorableOption = { isCorrect: false, advance: 0, penaltyType: 'skip' };
    expect(scoreForQuestion(back1, 1)).toBe(-1);
    expect(scoreForQuestion(back1, 99)).toBe(-1);
    expect(scoreForQuestion(skip, 1)).toBe(0);
  });
});

describe('penaltyScoreEffect', () => {
  it('maps back1, back2 and start to -1, -2 and -3', () => {
    expect(PENALTY_SCORE_EFFECTS.back1).toBe(-1);
    expect(PENALTY_SCORE_EFFECTS.back2).toBe(-2);
    expect(PENALTY_SCORE_EFFECTS.start).toBe(-3);
    expect(penaltyScoreEffect('back1')).toBe(-1);
    expect(penaltyScoreEffect('back2')).toBe(-2);
    expect(penaltyScoreEffect('start')).toBe(-3);
  });

  it('treats skip and null as no score penalty', () => {
    expect(PENALTY_SCORE_EFFECTS.skip).toBe(0);
    expect(penaltyScoreEffect('skip')).toBe(0);
    expect(penaltyScoreEffect(null)).toBe(0);
  });
});

describe('applyScore', () => {
  it('floors the result at zero', () => {
    expect(applyScore(1, -3)).toBe(0);
    expect(applyScore(0, -5)).toBe(0);
    expect(applyScore(-2, -3)).toBe(0);
  });

  it('keeps positive totals untouched', () => {
    expect(applyScore(10, -3)).toBe(7);
    expect(applyScore(0, 4)).toBe(4);
  });
});

describe('rankCorrectAnswersForQuestion', () => {
  it('ignores wrong answers and other questions entirely', () => {
    const answers = [
      answer('alice', 1, true, '2024-01-01T00:00:02Z'),
      answer('bob', 1, false, '2024-01-01T00:00:00Z'),
      answer('carol', 1, true, '2024-01-01T00:00:01Z'),
      answer('dave', 2, true, '2024-01-01T00:00:00Z'),
    ];
    const ranks = rankCorrectAnswersForQuestion(answers, 1);
    expect(ranks.get('carol')).toBe(1);
    expect(ranks.get('alice')).toBe(2);
    expect(ranks.has('bob')).toBe(false);
    expect(ranks.has('dave')).toBe(false);
    expect(ranks.size).toBe(2);
  });

  it('puts answers with missing or unparseable created_at last', () => {
    const answers = [
      answer('late', 1, true),
      answer('first', 1, true, '2024-01-01T00:00:00Z'),
      answer('broken', 1, true, 'not-a-date'),
    ];
    const ranks = rankCorrectAnswersForQuestion(answers, 1);
    expect(ranks.get('first')).toBe(1);
    expect(ranks.get('broken')).toBe(2);
    expect(ranks.get('late')).toBe(3);
  });

  it('is deterministic for identical timestamps regardless of input order', () => {
    const sameTime = '2024-01-01T00:00:00Z';
    const forward = [
      answer('carol', 1, true, sameTime),
      answer('alice', 1, true, sameTime),
      answer('bob', 1, true, sameTime),
    ];
    const shuffled = [
      answer('bob', 1, true, sameTime),
      answer('carol', 1, true, sameTime),
      answer('alice', 1, true, sameTime),
    ];
    const expected = new Map([
      ['alice', 1],
      ['bob', 2],
      ['carol', 3],
    ]);
    expect(rankCorrectAnswersForQuestion(forward, 1)).toEqual(expected);
    expect(rankCorrectAnswersForQuestion(shuffled, 1)).toEqual(expected);
  });
});

describe('accumulateSpeedRanks', () => {
  it('sums every player rank across multiple questions', () => {
    const answers = [
      answer('alice', 1, true, '2024-01-01T00:00:00Z'),
      answer('bob', 1, true, '2024-01-01T00:00:01Z'),
      answer('carol', 1, true, '2024-01-01T00:00:02Z'),
      answer('alice', 2, false, '2024-01-01T00:00:00Z'),
      answer('bob', 2, true, '2024-01-01T00:00:00Z'),
      answer('carol', 2, true, '2024-01-01T00:00:01Z'),
    ];
    const totals = accumulateSpeedRanks(answers);
    expect(totals.get('alice')).toBe(1);
    expect(totals.get('bob')).toBe(3);
    expect(totals.get('carol')).toBe(5);
  });
});

describe('raceTarget', () => {
  it('is 197 for a 35-question race on the real distribution (92 + 35*3)', () => {
    expect(realRace).toHaveLength(35);
    expect(raceTarget(realRace, 35)).toBe(197);
  });

  it('is the correct partial sum for a 10-question race', () => {
    // First ten advances in real order sum to 27; each question adds the top
    // speed bonus of 3 -> 27 + 10*3 = 57.
    const firstTen = REAL_ADVANCES.slice(0, 10);
    expect(firstTen).toEqual([3, 4, 2, 3, 3, 3, 2, 3, 2, 2]);
    expect(raceTarget(realRace, 10)).toBe(57);
  });
});

describe('rankPlayers', () => {
  it('orders by score descending, then speed rank ascending, then input order', () => {
    const players = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
    const scores = new Map([
      ['a', 30],
      ['b', 50],
      ['c', 50],
      ['d', 50],
    ]);
    const speedRanks = new Map([
      ['a', 1],
      ['b', 4],
      ['c', 2],
      ['d', 6],
    ]);
    expect(rankPlayers(players, scores, speedRanks).map((player) => player.id)).toEqual([
      'c',
      'b',
      'd',
      'a',
    ]);
  });

  it('falls back to input order when score and speed rank tie', () => {
    const players = [{ id: 'x' }, { id: 'y' }, { id: 'z' }];
    const scores = new Map([
      ['x', 10],
      ['y', 10],
      ['z', 10],
    ]);
    const speedRanks = new Map<string, number>();
    expect(rankPlayers(players, scores, speedRanks).map((player) => player.id)).toEqual([
      'x',
      'y',
      'z',
    ]);
  });

  it('does not mutate its input array', () => {
    const players = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const before = [...players];
    rankPlayers(players, new Map(), new Map());
    expect(players).toEqual(before);
  });
});