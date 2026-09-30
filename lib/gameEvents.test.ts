import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FALLBACK_POLL_INTERVAL_MS,
  STALL_AFTER_MS,
  WATCHDOG_CHECK_MS,
  openGameEventStream,
  parseEventData,
  watchdogNeedsPoll,
  type EventSourceLike,
  type GameEventFrame,
  type StreamStatus,
} from './gameEvents';

let instances: FakeEventSource[] = [];

class FakeEventSource implements EventSourceLike {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readyState: number = FakeEventSource.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  readonly url: string;
  closed = false;

  constructor(url: string) {
    this.url = url;
    instances.push(this);
  }

  open(): void {
    this.readyState = FakeEventSource.OPEN;
    this.onopen?.();
  }

  receive(data: string): void {
    this.onmessage?.({ data });
  }

  drop(): void {
    this.readyState = FakeEventSource.CONNECTING;
    this.onerror?.({});
  }

  close(): void {
    this.closed = true;
    this.readyState = FakeEventSource.CLOSED;
  }
}

const fakeCtor: new (url: string) => EventSourceLike = FakeEventSource;

const gamesFrame = (): string =>
  JSON.stringify({
    table: 'games',
    op: 'UPDATE',
    id: 'g1',
    game_id: 'g1',
    phase: 'question',
    question_revealed: true,
    current_question_index: 2,
  });

beforeEach(() => {
  instances = [];
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('watchdog constants', () => {
  it('binds the fallback interval and the stall thresholds so a wrong interval fails', () => {
    expect(FALLBACK_POLL_INTERVAL_MS).toBe(4_000);
    expect(FALLBACK_POLL_INTERVAL_MS).toBeGreaterThan(1500);
    expect(STALL_AFTER_MS).toBe(10_000);
    expect(WATCHDOG_CHECK_MS).toBe(2_000);
  });
});

describe('watchdogNeedsPoll', () => {
  it('reports healthy while the stream stays open, however long the silence', () => {
    expect(watchdogNeedsPoll({ lastOpenAt: 4000, createdAt: 0 }, true, 4000 + STALL_AFTER_MS * 10)).toBe(false);
  });

  it('a stream that has never opened only needs the fallback once the stall elapses', () => {
    const clock = { lastOpenAt: null, createdAt: 1000 };
    expect(watchdogNeedsPoll(clock, false, 1000 + STALL_AFTER_MS - 1)).toBe(false);
    expect(watchdogNeedsPoll(clock, false, 1000 + STALL_AFTER_MS)).toBe(true);
  });

  it('a dropped stream needs the fallback only after the stall since its last open', () => {
    const clock = { lastOpenAt: 5000, createdAt: 0 };
    expect(watchdogNeedsPoll(clock, false, 5000 + STALL_AFTER_MS - 1)).toBe(false);
    expect(watchdogNeedsPoll(clock, false, 5000 + STALL_AFTER_MS)).toBe(true);
  });

  it('reopening resets the stall window', () => {
    expect(watchdogNeedsPoll({ lastOpenAt: 9000, createdAt: 0 }, true, STALL_AFTER_MS * 10)).toBe(false);
  });
});

describe('parseEventData', () => {
  it('parses a games frame with the fields that drive the reveal', () => {
    expect(parseEventData(gamesFrame())).toEqual({
      table: 'games',
      op: 'UPDATE',
      id: 'g1',
      game_id: 'g1',
      phase: 'question',
      question_revealed: true,
      current_question_index: 2,
    });
  });

  it('parses a players frame without the games-only fields', () => {
    const frame = parseEventData(
      JSON.stringify({ table: 'players', op: 'INSERT', id: 'p1', game_id: 'g1' }),
    );
    expect(frame?.table).toBe('players');
    expect(frame?.game_id).toBe('g1');
  });

  it('rejects anything that is not a game-event frame', () => {
    expect(parseEventData('not json')).toBeNull();
    expect(parseEventData('')).toBeNull();
    expect(parseEventData(JSON.stringify({ hello: 'world' }))).toBeNull();
    expect(parseEventData(JSON.stringify({ table: 'games' }))).toBeNull();
  });
});

describe('openGameEventStream', () => {
  it('opens /events filtered by the game id', () => {
    openGameEventStream({
      gameId: 'g1',
      eventSourceCtor: fakeCtor,
      onEvent: () => {},
      onStatusChange: () => {},
    });
    expect(instances).toHaveLength(1);
    expect(instances[0]!.url).toBe('http://localhost:3002/events?game=g1');
  });

  it('forwards every valid frame and ignores noise so no frame is dropped', () => {
    const received: GameEventFrame[] = [];
    openGameEventStream({
      gameId: 'g1',
      eventSourceCtor: fakeCtor,
      onEvent: (frame) => received.push(frame),
      onStatusChange: () => {},
    });
    const es = instances[0]!;
    es.open();
    es.receive(gamesFrame());
    es.receive('keep-alive noise');
    es.receive(JSON.stringify({ table: 'answers', op: 'INSERT', id: 'a1', game_id: 'g1' }));
    expect(received).toHaveLength(2);
    expect(received[0]!.question_revealed).toBe(true);
    expect(received[1]!.table).toBe('answers');
  });

  it('degrades to fallback only after the stream is dropped for the stall window', () => {
    const statuses: StreamStatus[] = [];
    let now = 0;
    openGameEventStream({
      gameId: 'g1',
      now: () => now,
      eventSourceCtor: fakeCtor,
      onEvent: () => {},
      onStatusChange: (status) => statuses.push(status),
    });
    const es = instances[0]!;
    es.open();
    now = STALL_AFTER_MS;
    vi.advanceTimersByTime(WATCHDOG_CHECK_MS);
    expect(statuses).toEqual([]);

    es.drop();
    now = STALL_AFTER_MS * 2;
    vi.advanceTimersByTime(WATCHDOG_CHECK_MS * 10);
    expect(statuses).toEqual(['fallback']);

    es.open();
    expect(statuses).toEqual(['fallback', 'live']);
  });

  it('degrades when the stream never connects so the app cannot stall', () => {
    const statuses: StreamStatus[] = [];
    let now = 0;
    openGameEventStream({
      gameId: 'g1',
      now: () => now,
      eventSourceCtor: fakeCtor,
      onEvent: () => {},
      onStatusChange: (status) => statuses.push(status),
    });
    now = STALL_AFTER_MS - 1;
    vi.advanceTimersByTime(WATCHDOG_CHECK_MS * 10);
    expect(statuses).toEqual([]);
    now = STALL_AFTER_MS;
    vi.advanceTimersByTime(WATCHDOG_CHECK_MS);
    expect(statuses).toEqual(['fallback']);
  });

  it('close() stops the watchdog and the underlying stream', () => {
    const statuses: StreamStatus[] = [];
    let now = 0;
    const stream = openGameEventStream({
      gameId: 'g1',
      now: () => now,
      eventSourceCtor: fakeCtor,
      onEvent: () => {},
      onStatusChange: (status) => statuses.push(status),
    });
    const es = instances[0]!;
    stream.close();
    expect(es.closed).toBe(true);
    now = STALL_AFTER_MS * 10;
    vi.advanceTimersByTime(WATCHDOG_CHECK_MS * 100);
    expect(statuses).toEqual([]);
  });
});