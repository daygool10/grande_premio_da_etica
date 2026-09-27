const SEAT_KEY = 'gpe.seat.v1';

export interface Seat {
  role: 'admin' | 'player';
  gameId: string;
  gameCode: string;
  playerId: string | null;
}

function isSeat(value: unknown): value is Seat {
  if (typeof value !== 'object' || value === null) return false;
  const seat = value as Record<string, unknown>;
  return (
    (seat.role === 'admin' || seat.role === 'player') &&
    typeof seat.gameId === 'string' && seat.gameId.length > 0 &&
    typeof seat.gameCode === 'string' && seat.gameCode.length > 0 &&
    (seat.playerId === null ||
      (typeof seat.playerId === 'string' && seat.playerId.length > 0))
  );
}

export function readSeat(): Seat | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(SEAT_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearSeat();
    return null;
  }

  if (!isSeat(parsed)) {
    clearSeat();
    return null;
  }
  return parsed;
}

export function writeSeat(seat: Seat): void {
  try {
    window.localStorage.setItem(SEAT_KEY, JSON.stringify(seat));
  } catch {
    return;
  }
}

export function clearSeat(): void {
  try {
    window.localStorage.removeItem(SEAT_KEY);
  } catch {
    return;
  }
}