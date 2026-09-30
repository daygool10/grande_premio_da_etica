// Approved retention policy for the games table. The rules are independent and
// documented in docs/retention.md; the CLI wrapper in scripts/cleanup-games.mjs
// mirrors this exact policy so the dry-run plan matches what a --apply run does.
export const RETENTION_DAYS = 14;
export const RETENTION_HOURS_FOR_EMPTY = 24;
export const KEEP_NEWEST = 25;

const HOURS_TO_MS = 60 * 60 * 1000;

export interface GameCandidate {
  id: string;
  game_code: string;
  updated_at: string;
  playerCount: number;
  answerCount: number;
}

export interface RetentionDecision {
  game: GameCandidate;
  reason: 'empty-lobby' | 'stale';
  ageHours: number;
}

function parseTimestamp(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function ageHoursSince(updatedAt: string, now: Date): number | null {
  const timestamp = parseTimestamp(updatedAt);
  if (timestamp === null) return null;
  return (now.getTime() - timestamp) / HOURS_TO_MS;
}

// The two rules are independent - a candidate matches if either one applies.
// empty-lobby is immune to the newest-KEEP_NEWEST exemption because abandoned
// lobbies are the bulk of the growth; stale is not, because a game from last
// week must never be touched.
function reasonFor(
  game: GameCandidate,
  ageHours: number,
  keepNewest: ReadonlySet<string>,
): 'empty-lobby' | 'stale' | null {
  if (game.playerCount === 0 && ageHours > RETENTION_HOURS_FOR_EMPTY) {
    return 'empty-lobby';
  }
  if (ageHours > RETENTION_DAYS * 24 && !keepNewest.has(game.id)) {
    return 'stale';
  }
  return null;
}

// The exemption lists the KEEP_NEWEST most recently updated games by updated_at
// descending. An unparseable timestamp can never count as "recent", so it sorts
// to the back and never buys a game an exemption.
function keepNewestIds(games: readonly GameCandidate[]): Set<string> {
  return new Set(
    games
      .map((game) => ({ id: game.id, updatedAtMs: parseTimestamp(game.updated_at) }))
      .filter((entry): entry is { id: string; updatedAtMs: number } => entry.updatedAtMs !== null)
      .sort((a, b) => b.updatedAtMs - a.updatedAtMs)
      .slice(0, KEEP_NEWEST)
      .map((entry) => entry.id),
  );
}

// Selects the games the policy would delete, ordered oldest first. The input is
// never mutated, `now` is passed in so the function stays deterministic and
// testable, and an unparseable updated_at is treated as not deletable rather
// than as infinitely old.
export function selectGamesToDelete(games: readonly GameCandidate[], now: Date): RetentionDecision[] {
  const keepNewest = keepNewestIds(games);
  return games
    .map((game) => {
      const ageHours = ageHoursSince(game.updated_at, now);
      if (ageHours === null) return null;
      const reason = reasonFor(game, ageHours, keepNewest);
      if (reason === null) return null;
      return { game, reason, ageHours };
    })
    .filter((decision): decision is RetentionDecision => decision !== null)
    .sort(compareOldestFirst);
}

function compareOldestFirst(a: RetentionDecision, b: RetentionDecision): number {
  const aMs = parseTimestamp(a.game.updated_at) ?? 0;
  const bMs = parseTimestamp(b.game.updated_at) ?? 0;
  if (aMs !== bMs) return aMs - bMs;
  return a.game.id < b.game.id ? -1 : a.game.id > b.game.id ? 1 : 0;
}