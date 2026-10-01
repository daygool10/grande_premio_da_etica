import { describe, expect, it } from 'vitest';
import { createQuestionOrder, questions } from './questions';
import { finishLineForOrder } from '../server/shared/scoring.js';

describe('createQuestionOrder deals the whole question set', () => {
  it('returns every question id exactly once, in a shuffled order', () => {
    const order = createQuestionOrder();
    const allIds = questions.map((question) => question.id);

    expect(order).toHaveLength(allIds.length);
    expect(new Set(order)).toEqual(new Set(allIds));
    expect(new Set(order).size).toBe(allIds.length);
  });

  it('finishes the dealt race on the perfect-race ceiling for the whole set, above the retired 20-question ceiling', () => {
    const order = createQuestionOrder();
    const wholeSetCeiling = finishLineForOrder(
      questions.map((question) => question.id),
      questions,
    );
    const retiredTwentyCeiling = 113;

    expect(finishLineForOrder(order, questions)).toBe(wholeSetCeiling);
    expect(wholeSetCeiling).toBe(197);
    expect(wholeSetCeiling).toBeGreaterThan(retiredTwentyCeiling);
  });
});