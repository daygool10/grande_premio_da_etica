import { questions, DEFAULT_RACE_LENGTH } from '../data/questions';
import { raceTarget } from '../lib/scoring';
import type { Game } from './gameTypes';

export function activeRaceLength(game: Pick<Game, 'race_length'> | null | undefined): number {
  if (game && typeof game.race_length === 'number' && game.race_length > 0) {
    return game.race_length;
  }
  return DEFAULT_RACE_LENGTH;
}

export function raceFinishLine(game: Pick<Game, 'race_length'> | null | undefined): number {
  return raceTarget(questions, activeRaceLength(game));
}