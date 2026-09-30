import { create } from 'zustand';
import type { GameStore } from './gameTypes';
import { createLobbyActions } from './lobbyActions';
import { createSessionActions } from './sessionActions';
import { createPlayActions } from './playActions';
import { createSyncActions } from './syncActions';

export { DATABASE_SCHEMA_ERROR } from './gameTypes';

export const useGameStore = create<GameStore>((set, get) => ({
  viewState: 'start',
  game: null,
  streamFallback: false,
  players: [],
  currentPlayer: null,
  answers: [],
  selectedOption: null,
  hasAnswered: false,
  currentQuestion: null,
  showResult: false,
  resultMessage: '',
  isPenalty: false,
  penaltyMessage: '',
  finishedPlayers: [],
  recoveryCandidate: null,
  isCheckingRecovery: false,
  recoveryError: '',

  ...createLobbyActions(set, get),
  ...createSessionActions(set, get),
  ...createPlayActions(set, get),
  ...createSyncActions(set, get),
}));