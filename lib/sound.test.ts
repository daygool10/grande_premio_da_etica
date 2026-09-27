import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CUES } from './sound';

const SOUND_KEY = 'gpe.sound.v1';

const makeNode = () => ({
  type: 'sine',
  frequency: { setValueAtTime: vi.fn() },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
});
type NodeStub = ReturnType<typeof makeNode>;

type LocalStorageStub = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};
type WindowStub = { localStorage: LocalStorageStub; AudioContext?: unknown };

let sound: typeof import('./sound');
let windowStub: WindowStub;
let oscillators: NodeStub[];

function installAudio(state: 'suspended' | 'running' = 'running', resumeRejects = false): void {
  const context = {
    state,
    currentTime: 0,
    destination: {},
    resume: resumeRejects ? vi.fn(() => Promise.reject(new Error('blocked'))) : vi.fn(() => Promise.resolve()),
    createOscillator: () => {
      const node = makeNode();
      oscillators.push(node);
      return node;
    },
    createGain: () => ({ ...makeNode(), gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() } }),
  };
  windowStub.AudioContext = function () { return context; };
}

beforeEach(async () => {
  vi.resetModules();
  oscillators = [];
  const store = new Map<string, string>();
  windowStub = {
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
    },
    AudioContext: undefined,
  };
  Object.defineProperty(globalThis, 'window', { value: windowStub, configurable: true, writable: true });
  sound = await import('./sound');
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).window;
});

describe('sound preference storage', () => {
  it('returns unset when nothing is stored and round-trips on and off', () => {
    expect(sound.readSoundPreference()).toBe('unset');
    sound.setSoundPreference('on');
    expect(sound.readSoundPreference()).toBe('on');
    sound.setSoundPreference('off');
    expect(sound.readSoundPreference()).toBe('off');
  });

  it('reads an unrecognised stored value as unset', () => {
    windowStub.localStorage.setItem(SOUND_KEY, 'maybe');
    expect(sound.readSoundPreference()).toBe('unset');
  });

  it('does not throw when storage throws', () => {
    windowStub.localStorage = {
      getItem: () => { throw new Error('down'); },
      setItem: () => { throw new Error('down'); },
      removeItem: () => { throw new Error('down'); },
    };
    expect(() => sound.readSoundPreference()).not.toThrow();
    expect(() => sound.setSoundPreference('on')).not.toThrow();
    expect(() => sound.playCue('correct')).not.toThrow();
  });
});

describe('playCue', () => {
  it('schedules one oscillator per note at the cue frequencies', () => {
    installAudio();
    expect(sound.unlockAudio()).toBe(true);
    sound.setSoundPreference('on');
    sound.playCue('correct');
    sound.playCue('podium');
    expect(CUES.podium).toHaveLength(3);
    expect(oscillators).toHaveLength(CUES.correct.length + CUES.podium.length);
    expect(oscillators[0].type).toBe(CUES.correct[0].waveform);
    expect(oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(CUES.correct[0].frequency, expect.any(Number));
  });

  it('schedules nothing when the preference is unset or off', () => {
    installAudio();
    sound.unlockAudio();
    sound.playCue('correct');
    sound.setSoundPreference('off');
    sound.playCue('wrong');
    expect(oscillators).toHaveLength(0);
  });

  it('never throws when no AudioContext is available', () => {
    sound.setSoundPreference('on');
    expect(() => sound.playCue('correct')).not.toThrow();
    expect(sound.unlockAudio()).toBe(false);
    expect(() => sound.playCue('podium')).not.toThrow();
  });
});

describe('unlockAudio', () => {
  it('returns false without throwing when resume is rejected', () => {
    installAudio('suspended', true);
    expect(() => sound.unlockAudio()).not.toThrow();
    expect(sound.unlockAudio()).toBe(false);
  });
});