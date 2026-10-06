import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { boardScale } from '../data/questions';

const root = join(import.meta.dirname, '..');

describe('render board scale', () => {
  it('scales four render spaces per question', () => {
    expect(boardScale(0)).toBe(0);
    expect(boardScale(1)).toBe(4);
    expect(boardScale(7)).toBe(28);
    expect(Number.isFinite(boardScale(0))).toBe(true);
    expect(boardScale(0)).toBeGreaterThanOrEqual(0);
  });

  it('is monotonic', () => {
    expect(boardScale(2)).toBeLessThanOrEqual(boardScale(5));
    expect(boardScale(5)).toBeLessThanOrEqual(boardScale(10));
  });

  it('is never used as a player-position eligibility threshold', () => {
    const callers = readdirSync(join(root, 'components'))
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .map((file) => readFileSync(join(root, 'components', file), 'utf8'));
    expect(callers.join('\n')).not.toMatch(/(?:position|player\.position)\s*(?:<|>|<=|>=|===|!==)\s*(?:boardSize|boardScale)|(?:boardSize|boardScale)\s*(?:<|>|<=|>=|===|!==)\s*(?:position|player\.position)/i);
  });
});
