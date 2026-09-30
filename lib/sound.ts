export type CueName = 'correct' | 'wrong' | 'podium';

export interface CueNote {
  frequency: number;   // Hz
  durationMs: number;
  delayMs: number;     // offset from the start of the cue
  waveform: OscillatorType;
  gain: number;
}

export const CUES: Record<CueName, readonly CueNote[]> = {
  correct: [{ frequency: 880,    durationMs: 120, delayMs: 0,   waveform: 'sine',   gain: 0.20 }],
  wrong:   [{ frequency: 196,    durationMs: 220, delayMs: 0,   waveform: 'square', gain: 0.14 }],
  podium:  [
    { frequency: 523.25, durationMs: 120, delayMs: 0,   waveform: 'sine', gain: 0.20 },
    { frequency: 659.25, durationMs: 120, delayMs: 120, waveform: 'sine', gain: 0.20 },
    { frequency: 783.99, durationMs: 260, delayMs: 240, waveform: 'sine', gain: 0.22 },
  ],
};

export type SoundPreference = 'unset' | 'on' | 'off';

const SOUND_KEY = 'gpe.sound.v1';

// The attack is a short fade-in and the release a fade-out over the note's tail,
// so neither edge of a note clicks; the gain is zero outside its window.
const ATTACK_SECONDS = 0.008;
const RELEASE_SECONDS = 0.02;

function readStoredPreference(): string | null {
  try {
    return window.localStorage.getItem(SOUND_KEY);
  } catch {
    return null;
  }
}

export function readSoundPreference(): SoundPreference {
  const stored = readStoredPreference();
  if (stored !== 'on' && stored !== 'off') return 'unset';
  return stored;
}

export function setSoundPreference(preference: 'on' | 'off'): void {
  try {
    window.localStorage.setItem(SOUND_KEY, preference);
  } catch {
    return;
  }
}

let audioContext: AudioContext | null = null;

function scheduleNote(playStart: number, note: CueNote): void {
  if (audioContext === null) return;
  const start = playStart + note.delayMs / 1000;
  const end = start + note.durationMs / 1000;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.type = note.waveform;
  oscillator.frequency.setValueAtTime(note.frequency, start);
  gainNode.gain.setValueAtTime(0, start);
  gainNode.gain.linearRampToValueAtTime(note.gain, start + ATTACK_SECONDS);
  gainNode.gain.setValueAtTime(note.gain, end - RELEASE_SECONDS);
  gainNode.gain.linearRampToValueAtTime(0, end);
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(end);
}

// Built lazily and resumed on first call so the user gesture that says yes to
// the sound prompt is what satisfies the browser autoplay policy. Any refusal,
// missing constructor or rejected resume simply yields false and voids the
// context; this never throws.
export function unlockAudio(): boolean {
  if (typeof window.AudioContext !== 'function') return false;
  try {
    if (audioContext === null) {
      audioContext = new window.AudioContext();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {
        audioContext = null;
      });
    }
    return audioContext.state === 'running';
  } catch {
    audioContext = null;
    return false;
  }
}

export function playCue(name: CueName): void {
  if (readSoundPreference() !== 'on') return;
  if (audioContext === null || audioContext.state !== 'running') return;
  const context = audioContext;
  const notes = CUES[name];
  if (notes.length === 0) return;
  try {
    const playStart = context.currentTime;
    for (const note of notes) {
      scheduleNote(playStart, note);
    }
  } catch (error) {
    console.error('Failed to play sound cue', name, error);
  }
}