import { describe, expect, it } from 'vitest';
import { questions } from '../data/questions';
import { finishLineForOrder, hasReachedFinishLine } from '../server/shared/scoring.js';

// The real 20-question dealt subset from a reproduced game. A perfect run over
// it scores exactly 113: 53 from the largest correct advance of each dealt
// question plus 3 speed bonus per question. This is the regression guard
// against anyone reintroducing the retired board-squares finish line, whose
// 20-question value was 30.
const TWENTY_QUESTION_SUBSET = [
  19, 35, 17, 18, 32, 1, 5, 33, 10, 26,
  16, 25, 29, 27, 31, 28, 30, 20, 23, 6,
];

describe('UI finish line mirrors the scoring engine', () => {
  it('fixes the 20-question dealt subset target at 113 points', () => {
    expect(finishLineForOrder(TWENTY_QUESTION_SUBSET, questions)).toBe(113);
  });

  it('disagrees with the retired board-squares finish line (30 at 20 questions)', () => {
    const finishLine = finishLineForOrder(TWENTY_QUESTION_SUBSET, questions);
    const retiredBoardSquaresAtTwenty = 30;
    expect(finishLine).not.toBe(retiredBoardSquaresAtTwenty);
    expect(finishLine).toBeGreaterThan(retiredBoardSquaresAtTwenty);
  });
});

describe('hasReachedFinishLine', () => {
  it('does not finish a player on 30 points under the 113-point subset', () => {
    const finishLine = finishLineForOrder(TWENTY_QUESTION_SUBSET, questions);
    expect(hasReachedFinishLine(30, finishLine)).toBe(false);
  });

  it('finishes a player exactly on the target', () => {
    const finishLine = finishLineForOrder(TWENTY_QUESTION_SUBSET, questions);
    expect(hasReachedFinishLine(finishLine, finishLine)).toBe(true);
    expect(hasReachedFinishLine(finishLine + 1, finishLine)).toBe(true);
  });
});