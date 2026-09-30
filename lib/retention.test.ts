import { describe, expect, it } from 'vitest';
import {
  KEEP_NEWEST,
  RETENTION_DAYS,
  RETENTION_HOURS_FOR_EMPTY,
  selectGamesToDelete,
  type GameCandidate,
} from './retention';

const NOW = new Date('2024-06-01T12:00:00Z');

const candidate = (overrides: Partial<GameCandidate> = {}): GameCandidate => ({
  id: 'g1',
  game_code: 'ABC123',
  updated_at: '2024-06-01T12:00:00Z',
  playerCount: 1,
  answerCount: 5,
  ...overrides,
});

const hoursAgo = (hours: number): string =>
  new Date(NOW.getTime() - hours * 60 * 60 * 1000).toISOString();

const daysAgo = (days: number): string =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

// Builds a list of `count` recent games plus `target` underneath them, which
// puts target outside the newest-KEEP_NEWEST exemption when count >= KEEP_NEWEST.
const withNewerGames = (target: GameCandidate, count: number): GameCandidate[] => [
  ...Array.from({ length: count }, (_, i) =>
    candidate({ id: `new-${i}`, game_code: `NEW${i}`, updated_at: hoursAgo(i + 1) }),
  ),
  target,
];

describe('policy constants', () => {
  it('are the approved numbers', () => {
    expect(RETENTION_DAYS).toBe(14);
    expect(RETENTION_HOURS_FOR_EMPTY).toBe(24);
    expect(KEEP_NEWEST).toBe(25);
  });
});

describe('selectGamesToDelete', () => {
  it('keeps a fresh game that still has players', () => {
    const result = selectGamesToDelete([candidate({ updated_at: hoursAgo(1) })], NOW);
    expect(result).toEqual([]);
  });

  it('deletes a 20-day-old game with players that is outside the newest 25', () => {
    const target = candidate({ id: 'old', game_code: 'OLD', updated_at: daysAgo(20), playerCount: 2 });
    const result = selectGamesToDelete(withNewerGames(target, KEEP_NEWEST), NOW);
    expect(result).toHaveLength(1);
    expect(result[0].game.id).toBe('old');
    expect(result[0].reason).toBe('stale');
    expect(result[0].ageHours).toBeCloseTo(20 * 24, 0);
  });

  it('keeps a 20-day-old game that is within the newest 25', () => {
    const target = candidate({ id: 'old', game_code: 'OLD', updated_at: daysAgo(20), playerCount: 2 });
    const onlyTenNewer = [...Array.from({ length: 10 }, () => candidate({ updated_at: hoursAgo(1) })), target];
    expect(selectGamesToDelete(onlyTenNewer, NOW)).toEqual([]);
  });

  it('keeps a 2-hour-old empty lobby', () => {
    const result = selectGamesToDelete([candidate({ playerCount: 0, updated_at: hoursAgo(2) })], NOW);
    expect(result).toEqual([]);
  });

  it('deletes a 30-hour-old empty lobby as an empty lobby even inside the newest 25', () => {
    const target = candidate({ id: 'empty', playerCount: 0, updated_at: hoursAgo(30) });
    const result = selectGamesToDelete([target], NOW);
    expect(result).toHaveLength(1);
    expect(result[0].game.id).toBe('empty');
    expect(result[0].reason).toBe('empty-lobby');
  });

  it('reports empty-lobby when a game is both empty and outside the newest 25', () => {
    const target = candidate({ id: 'abandoned', playerCount: 0, updated_at: daysAgo(20) });
    const result = selectGamesToDelete(withNewerGames(target, KEEP_NEWEST), NOW);
    expect(result).toHaveLength(1);
    expect(result[0].reason).toBe('empty-lobby');
  });

  it('keeps a game at exactly the 14-day staleness boundary', () => {
    const target = candidate({ updated_at: daysAgo(14) });
    const result = selectGamesToDelete(withNewerGames(target, KEEP_NEWEST), NOW);
    expect(result).toEqual([]);
  });

  it('never deletes a game whose updated_at cannot be parsed', () => {
    const broken = candidate({ id: 'broken', playerCount: 0, updated_at: 'not-a-date' });
    const result = selectGamesToDelete([broken], NOW);
    expect(result).toEqual([]);
  });

  it('orders the output oldest first regardless of input order', () => {
    const older = candidate({ id: 'older', playerCount: 0, updated_at: hoursAgo(100) });
    const middle = candidate({ id: 'middle', playerCount: 0, updated_at: hoursAgo(50) });
    const newer = candidate({ id: 'newer', playerCount: 0, updated_at: hoursAgo(30) });
    const result = selectGamesToDelete([newer, older, middle], NOW);
    expect(result.map((decision) => decision.game.id)).toEqual(['older', 'middle', 'newer']);
  });

  it('does not mutate its input array', () => {
    const games = [candidate(), candidate({ playerCount: 0, updated_at: daysAgo(20) })];
    const before = games.map((game) => ({ ...game }));
    selectGamesToDelete(games, NOW);
    expect(games).toEqual(before);
  });
});