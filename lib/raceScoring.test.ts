import { describe, expect, it } from 'vitest';
import {
  accumulateSpeedRanks,
  dealtQuestions,
  finishLineForOrder,
  raceFinishLine,
  rankCorrectAnswersForQuestion,
  rankPlayers,
  scoreReveal,
  type IdentifiableQuestion,
  type PenaltyType,
  type ScorableAnswer,
  type ScorableOption,
  type ScorablePlayer,
} from '../server/shared/scoring.js';

const option = (isCorrect: boolean, advance: number, penaltyType: PenaltyType): ScorableOption => ({
  isCorrect,
  advance,
  penaltyType,
});

// A two-option reveal: a wrong option at index 0 and the single correct option
// carrying `advance` at index 1, mirroring the shape of data/questions.tsx rows.
const questionOptions = (advance: number, wrongPenalty: PenaltyType): ScorableOption[] => [
  option(false, 0, wrongPenalty),
  option(true, advance, null),
];

const player = (id: string, position: number, skipped_turn = false): ScorablePlayer => ({
  id,
  position,
  skipped_turn,
});

const answer = (
  player_id: string,
  question_index: number,
  selected_option: number,
  is_correct: boolean,
  created_at?: string,
): ScorableAnswer => ({ player_id, question_index, selected_option, is_correct, created_at });

const question = (id: number, advance: number): IdentifiableQuestion => ({
  id,
  options: [option(false, 0, null), option(true, advance, null)],
});

describe('dealtQuestions', () => {
  it('resolves dealt question i by id, never by position in the global array', () => {
    const all = [question(1, 2), question(2, 4), question(3, 3)];
    const ordered = dealtQuestions([2, 1, 3], all);
    expect(ordered).toHaveLength(3);
    expect(ordered[0].options.find(o => o.isCorrect)?.advance).toBe(4);
    expect(ordered[1].options.find(o => o.isCorrect)?.advance).toBe(2);
    expect(ordered[2].options.find(o => o.isCorrect)?.advance).toBe(3);
  });

  it('throws when a dealt question id is missing from the question set', () => {
    expect(() => dealtQuestions([99], [question(1, 2)])).toThrow();
  });
});

describe('raceFinishLine and finishLineForOrder', () => {
  it('derives a smaller dealt subset to a finish line below the whole set', () => {
    // q1..q4 all advance 2; q5 advances 4. A race dealing only [5] (7 points:
    // its 4 advance plus the top speed bonus) must not inherit the whole-set
    // or the global-first-5 line, so indexing the global array here fails.
    const all = [question(1, 2), question(2, 2), question(3, 2), question(4, 2), question(5, 4)];
    const subset = [5];
    expect(raceFinishLine(dealtQuestions([5], all))).toBe(7);
    expect(finishLineForOrder(subset, all)).toBe(4 + 3);
    expect(raceFinishLine(dealtQuestions(subset, all))).toBeLessThan(raceFinishLine(all));
  });

  it('sums (largest correct advance + 3) over the dealt subset exactly', () => {
    const all = [question(1, 3), question(2, 2), question(3, 4)];
    expect(finishLineForOrder([1, 2, 3], all)).toBe((3 + 3) + (2 + 3) + (4 + 3));
  });
});

describe('scoreReveal', () => {
  it('scores a three-question race exactly, with the arithmetic as literals', () => {
    const questions = [questionOptions(3, 'back1'), questionOptions(2, 'back1'), questionOptions(4, 'back1')];
    const allAnswers = [
      answer('alice', 0, 1, true, '2024-01-01T00:00:00Z'),
      answer('bob', 0, 1, true, '2024-01-01T00:00:01Z'),
      answer('alice', 1, 1, true, '2024-01-01T00:00:00Z'),
      answer('bob', 1, 1, true, '2024-01-01T00:00:01Z'),
      answer('alice', 2, 1, true, '2024-01-01T00:00:00Z'),
      answer('bob', 2, 1, true, '2024-01-01T00:00:01Z'),
    ];

    const afterFirst = scoreReveal(questions[0], [player('alice', 0), player('bob', 0)], allAnswers, 0);
    expect(rankCorrectAnswersForQuestion(allAnswers, 0).get('alice')).toBe(1);
    expect(rankCorrectAnswersForQuestion(allAnswers, 0).get('bob')).toBe(2);
    expect(afterFirst).toEqual([
      { id: 'alice', position: 0 + 3 + 3, skipped_turn: false },
      { id: 'bob', position: 0 + 3 + 2, skipped_turn: false },
    ]);

    const afterSecond = scoreReveal(questions[1], afterFirst, allAnswers, 1);
    expect(afterSecond).toEqual([
      { id: 'alice', position: 6 + 2 + 3, skipped_turn: false },
      { id: 'bob', position: 5 + 2 + 2, skipped_turn: false },
    ]);

    const afterThird = scoreReveal(questions[2], afterSecond, allAnswers, 2);
    expect(afterThird).toEqual([
      { id: 'alice', position: 11 + 4 + 3, skipped_turn: false },
      { id: 'bob', position: 9 + 4 + 2, skipped_turn: false },
    ]);

    expect(finishLineForOrder([1, 2, 3], [question(1, 3), question(2, 2), question(3, 4)])).toBe(18);
    const finalScores = new Map(afterThird.map(update => [update.id, update.position]));
    expect(finalScores.get('alice')).toBe(18);
    expect(finalScores.get('bob')).toBe(15);
    expect(rankPlayers([{ id: 'alice' }, { id: 'bob' }], finalScores, accumulateSpeedRanks(allAnswers)).map(p => p.id))
      .toEqual(['alice', 'bob']);
  });

  it('applies back1 exactly as -1', () => {
    const [update] = scoreReveal(questionOptions(3, 'back1'), [player('alice', 2)], [
      answer('alice', 0, 0, false, '2024-01-01T00:00:00Z'),
    ], 0);
    expect(update.position).toBe(1);
  });

  it('floors the worst penalty at zero instead of going negative', () => {
    const [update] = scoreReveal(questionOptions(3, 'start'), [player('alice', 1)], [
      answer('alice', 0, 0, false, '2024-01-01T00:00:00Z'),
    ], 0);
    expect(update.position).toBe(0);
    expect(update.position).not.toBe(-2);
  });

  it('costs a skip its turn, never its score', () => {
    const [update] = scoreReveal(questionOptions(3, 'skip'), [player('alice', 4)], [
      answer('alice', 0, 0, false, '2024-01-01T00:00:00Z'),
    ], 0);
    expect(update).toEqual({ id: 'alice', position: 4, skipped_turn: true });
  });

  it('still penalises a wrong answer for a player at or past the finish line', () => {
    const finishLine = 18;
    const [alice, bob] = scoreReveal(questionOptions(3, 'back1'), [
      player('alice', finishLine),
      player('bob', 12),
    ], [
      answer('alice', 0, 0, false, '2024-01-01T00:00:00Z'),
      answer('bob', 0, 1, true, '2024-01-01T00:00:01Z'),
    ], 0);
    expect(alice.position).toBe(finishLine - 1);
    expect(alice.position).toBe(17);
    expect(bob).toEqual({ id: 'bob', position: 12 + 3 + 3, skipped_turn: false });
  });

  it('keeps a player already on zero at zero under the worst penalty', () => {
    const [update] = scoreReveal(questionOptions(3, 'start'), [player('alice', 0)], [
      answer('alice', 0, 0, false, '2024-01-01T00:00:00Z'),
    ], 0);
    expect(update.position).toBe(0);
    expect(update.position).not.toBe(-3);
  });
});

describe('tiebreak by cumulative speed rank', () => {
  it('orders two level-on-points players by speed: the faster cumulative rank first', () => {
    const questions = [questionOptions(3, 'start'), questionOptions(3, 'back1'), questionOptions(3, 'back1')];
    const players = [player('alice', 0), player('bob', 0)];
    const answers = [
      answer('alice', 0, 1, true, '2024-01-01T00:00:00Z'),
      answer('bob', 0, 0, false, '2024-01-01T00:00:01Z'),
      answer('alice', 1, 0, false, '2024-01-01T00:00:00Z'),
      answer('bob', 1, 1, true, '2024-01-01T00:00:01Z'),
      answer('alice', 2, 1, true, '2024-01-01T00:00:00Z'),
      answer('bob', 2, 1, true, '2024-01-01T00:00:01Z'),
    ];

    let currentPlayers = players;
    for (let index = 0; index < questions.length; index += 1) {
      currentPlayers = scoreReveal(questions[index], currentPlayers, answers, index);
    }

    const finalScores = new Map(currentPlayers.map(update => [update.id, update.position]));
    expect(finalScores.get('alice')).toBe(11);
    expect(finalScores.get('bob')).toBe(11);

    const speedRanks = accumulateSpeedRanks(answers);
    expect(speedRanks.get('alice')).toBe(2);
    expect(speedRanks.get('bob')).toBe(3);

    expect(rankPlayers(players, finalScores, speedRanks).map(p => p.id)).toEqual(['alice', 'bob']);
  });
});