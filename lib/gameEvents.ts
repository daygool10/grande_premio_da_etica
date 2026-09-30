export type GameEventTable = 'games' | 'players' | 'answers';
export type GameEventOp = 'INSERT' | 'UPDATE' | 'DELETE';

export interface GameEventFrame {
  table: GameEventTable;
  op: GameEventOp;
  id: string;
  game_id: string;
  phase?: string;
  question_revealed?: boolean;
  current_question_index?: number;
}

export type StreamStatus = 'live' | 'fallback';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';
const EVENT_STREAM_PATH = '/events';

export const WATCHDOG_CHECK_MS = 2_000;
export const STALL_AFTER_MS = 10_000;
export const FALLBACK_POLL_INTERVAL_MS = 4_000;

const ES_OPEN = 1;

export interface WatchdogClock {
  lastOpenAt: number | null;
  createdAt: number;
}

export function watchdogNeedsPoll(
  clock: WatchdogClock,
  isOpen: boolean,
  now: number,
  staleAfterMs: number = STALL_AFTER_MS,
): boolean {
  if (isOpen) return false;
  const reference = clock.lastOpenAt ?? clock.createdAt;
  return now - reference >= staleAfterMs;
}

export function parseEventData(raw: string): GameEventFrame | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const frame = parsed as Record<string, unknown>;
    if (typeof frame.table !== 'string' || typeof frame.game_id !== 'string') return null;
    return parsed as unknown as GameEventFrame;
  } catch {
    return null;
  }
}

export interface EventSourceLike {
  readyState: number;
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  close(): void;
}

export type EventSourceConstructor = new (url: string) => EventSourceLike;

export interface OpenGameEventStreamOptions {
  gameId: string;
  onEvent: (frame: GameEventFrame) => void;
  onStatusChange: (status: StreamStatus) => void;
  eventSourceCtor?: EventSourceConstructor;
  now?: () => number;
}

export interface GameEventStream {
  close(): void;
}

function resolveEventSourceCtor(injected?: EventSourceConstructor): EventSourceConstructor | null {
  if (injected) return injected;
  const globalWithEventSource = globalThis as { EventSource?: EventSourceConstructor };
  if (typeof globalWithEventSource.EventSource !== 'undefined') {
    return globalWithEventSource.EventSource;
  }
  return null;
}

export function openGameEventStream(options: OpenGameEventStreamOptions): GameEventStream {
  const { gameId, onEvent, onStatusChange } = options;
  const now = options.now ?? Date.now;
  const EventSourceCtor = resolveEventSourceCtor(options.eventSourceCtor);

  const url = `${API_BASE_URL}${EVENT_STREAM_PATH}?game=${encodeURIComponent(gameId)}`;

  if (EventSourceCtor === null) {
    console.error('[gameEvents] EventSource is not available in this runtime; using polling fallback');
    onStatusChange('fallback');
    return { close() {} };
  }

  const es = new EventSourceCtor(url);
  const createdAt = now();
  let lastOpenAt: number | null = null;
  let degraded = false;
  let closed = false;
  let errorLogged = false;
  let watchdogTimer: ReturnType<typeof setInterval> | null = null;

  const refreshSignal = () => {
    lastOpenAt = now();
    if (degraded) {
      degraded = false;
      onStatusChange('live');
    }
  };

  es.onopen = () => {
    errorLogged = false;
    refreshSignal();
  };

  es.onmessage = (event) => {
    errorLogged = false;
    refreshSignal();
    const frame = parseEventData(String(event.data));
    if (frame !== null) onEvent(frame);
  };

  es.onerror = () => {
    if (!errorLogged) {
      errorLogged = true;
      console.error('[gameEvents] stream failed to stay connected; polling takes over if this persists');
    }
  };

  watchdogTimer = setInterval(() => {
    if (closed) return;
    const isOpen = es.readyState === ES_OPEN;
    if (isOpen) lastOpenAt = now();
    const needsPoll = watchdogNeedsPoll({ lastOpenAt, createdAt }, isOpen, now());
    if (needsPoll && !degraded) {
      degraded = true;
      onStatusChange('fallback');
    } else if (!needsPoll && degraded) {
      degraded = false;
      onStatusChange('live');
    }
  }, WATCHDOG_CHECK_MS);

  return {
    close() {
      if (closed) return;
      closed = true;
      if (watchdogTimer !== null) clearInterval(watchdogTimer);
      es.close();
    },
  };
}