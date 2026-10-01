import { describe, expect, it } from 'vitest';
import { questions } from '../data/questions';
import {
  overtakeReport,
  questionDeltas,
  type AnswerLike,
  type PlayerLike,
  type ScorableQuestion,
} from './debrief';
import type { PenaltyType, ScorableOption } from '../server/shared/scoring.js';

const option = (isCorrect: boolean, advance: number, penaltyType: PenaltyType): ScorableOption => ({ isCorrect, advance, penaltyType });
const correctAdvance = (advance: number): ScorableOption => option(true, advance, null);
const wrong = (penaltyType: PenaltyType): ScorableOption => option(false, 0, penaltyType);
const question = (...options: ScorableOption[]): ScorableQuestion => ({ options });
const answer = (
  player_id: string,
  question_index: number,
  is_correct: boolean,
  selected_option: number,
  created_at?: string,
): AnswerLike => ({ player_id, question_index, is_correct, selected_option, created_at });
const player = (id: string, position: number, team_name: string): PlayerLike => ({ id, position, team_name });

describe('questionDeltas', () => {
  it('pays the fastest correct answer its advance plus 3 and the second plus 2', () => {
    const players = [player('alice', 6, 'McLaren'), player('bob', 5, 'Ferrari')];
    const answers = [
      answer('alice', 0, true, 0, '2024-01-01T00:00:00Z'),
      answer('bob', 0, true, 0, '2024-01-01T00:00:01Z'),
    ];
    const deltas = questionDeltas(answers, players, [question(correctAdvance(3), wrong('back1'))], 0);
    expect(deltas.get('alice')).toMatchObject({ isCorrect: true, speedRank: 1, delta: 6, scoreAfter: 6 });
    expect(deltas.get('bob')).toMatchObject({ isCorrect: true, speedRank: 2, delta: 5, scoreAfter: 5 });
  });

  it('loses exactly 1 on back1 and exactly 3 on start', () => {
    const players = [player('alice', 2, 'McLaren')];
    const questions = [
      question(correctAdvance(3), wrong('back1')),
      question(correctAdvance(3), wrong('back1')),
      question(correctAdvance(3), wrong('start')),
    ];
    const answers = [
      answer('alice', 0, true, 0, '2024-01-01T00:00:00Z'),
      answer('alice', 1, false, 1, '2024-01-01T00:00:00Z'),
      answer('alice', 2, false, 1, '2024-01-01T00:00:00Z'),
    ];
    const back1 = questionDeltas(answers, players, questions, 1).get('alice');
    const start = questionDeltas(answers, players, questions, 2).get('alice');
    expect(back1).toMatchObject({ delta: -1, scoreBefore: 6, scoreAfter: 5 });
    expect(start).toMatchObject({ delta: -3, scoreBefore: 5, scoreAfter: 2 });
  });

  it('scores a skip as zero so a score passes through unchanged', () => {
    const players = [player('alice', 6, 'McLaren')];
    const questions = [
      question(correctAdvance(3), wrong('skip')),
      question(correctAdvance(3), wrong('skip')),
    ];
    const answers = [
      answer('alice', 0, true, 0, '2024-01-01T00:00:00Z'),
      answer('alice', 1, false, 1, '2024-01-01T00:00:00Z'),
    ];
    const deltas = questionDeltas(answers, players, questions, 1);
    expect(deltas.get('alice')).toMatchObject({
      isCorrect: false, speedRank: 0, delta: 0, scoreBefore: 6, scoreAfter: 6,
    });
  });

  it('replays the zero floor instead of position - delta for a pinned player', () => {
    const players = [player('alice', 0, 'McLaren')];
    const questions = [
      question(correctAdvance(3), wrong('start')),
      question(correctAdvance(3), wrong('start')),
    ];
    const answers = [
      answer('alice', 0, false, 1, '2024-01-01T00:00:00Z'),
      answer('alice', 1, false, 1, '2024-01-01T00:00:00Z'),
    ];
    const deltas = questionDeltas(answers, players, questions, 1);
    expect(deltas.get('alice')).toEqual({
      playerId: 'alice', isCorrect: false, speedRank: 0, delta: -3,
      scoreBefore: 0, scoreAfter: 0,
    });
    // position - delta would reconstruct scoreBefore as 3; the floor makes it 0.
    expect(deltas.get('alice')?.scoreBefore).not.toBe(3);
  });
});

describe('overtakeReport', () => {
  it('reports an overtake from both sides with team names and places gained', () => {
    const players = [player('x', 5, 'Alpha'), player('y', 11, 'Beta')];
    const questions = [
      question(correctAdvance(3), wrong('back1')),
      question(correctAdvance(3), wrong('back1')),
    ];
    const answers = [
      answer('x', 0, true, 0, '2024-01-01T00:00:00Z'),
      answer('y', 0, true, 0, '2024-01-01T00:00:01Z'),
      answer('x', 1, false, 1, '2024-01-01T00:00:00Z'),
      answer('y', 1, true, 0, '2024-01-01T00:00:00Z'),
    ];
    const deltas = questionDeltas(answers, players, questions, 1);
    const report = overtakeReport(deltas, players);
    expect(deltas.get('x')).toMatchObject({ scoreBefore: 6, delta: -1, scoreAfter: 5 });
    expect(deltas.get('y')).toMatchObject({ scoreBefore: 5, delta: 6, scoreAfter: 11 });
    expect(report.get('x')).toEqual({ playerId: 'x', placesGained: -1, passedNames: [], passedByName: ['Beta'] });
    expect(report.get('y')).toEqual({ playerId: 'y', placesGained: 1, passedNames: ['Alpha'], passedByName: [] });
  });

  it('reports no overtake when no score changes', () => {
    const players = [player('x', 6, 'Alpha'), player('y', 5, 'Beta')];
    const questions = [
      question(correctAdvance(3), wrong('skip')),
      question(correctAdvance(3), wrong('skip')),
    ];
    const answers = [
      answer('x', 0, true, 0, '2024-01-01T00:00:00Z'),
      answer('y', 0, true, 0, '2024-01-01T00:00:01Z'),
      answer('x', 1, false, 1, '2024-01-01T00:00:00Z'),
      answer('y', 1, false, 1, '2024-01-01T00:00:00Z'),
    ];
    const deltas = questionDeltas(answers, players, questions, 1);
    const report = overtakeReport(deltas, players);
    expect(report.get('x')).toEqual({ playerId: 'x', placesGained: 0, passedNames: [], passedByName: [] });
    expect(report.get('y')).toEqual({ playerId: 'y', placesGained: 0, passedNames: [], passedByName: [] });
  });

  it('breaks equal-score ties by player id so the order is input-independent', () => {
    const forward = [player('zz', 6, 'Alpha'), player('aa', 0, 'Beta')];
    const backward = [player('aa', 0, 'Beta'), player('zz', 6, 'Alpha')];
    const questions = [question(correctAdvance(3), wrong('back1'))];
    const answers = [
      answer('zz', 0, true, 0, '2024-01-01T00:00:00Z'),
      answer('aa', 0, false, 1, '2024-01-01T00:00:00Z'),
    ];
    const deltas = questionDeltas(answers, forward, questions, 0);
    expect(overtakeReport(deltas, forward).get('zz')).toEqual({
      playerId: 'zz', placesGained: 1, passedNames: ['Beta'], passedByName: [],
    });
    expect(overtakeReport(deltas, forward)).toEqual(overtakeReport(deltas, backward));
  });
});

describe('real question data from data/questions.tsx', () => {
  it('scores the first question using its real options', () => {
    const players = [player('alice', 6, 'McLaren'), player('bob', 0, 'Ferrari')];
    const answers = [
      answer('alice', 0, true, 3, '2024-01-01T00:00:00Z'),
      answer('bob', 0, false, 0, '2024-01-01T00:00:00Z'),
    ];
    const deltas = questionDeltas(answers, players, questions, 0);
    expect(deltas.get('alice')).toMatchObject({ isCorrect: true, speedRank: 1, delta: 6, scoreAfter: 6 });
    expect(deltas.get('bob')).toMatchObject({ isCorrect: false, speedRank: 0, delta: -1, scoreAfter: 0 });
  });
});