import { create } from 'zustand';
import type { GameStore } from './gameTypes';
import { createLobbyActions } from './lobbyActions';
import { createPlayActions } from './playActions';
import { createSyncActions } from './syncActions';

export const useGameStore = create<GameStore>((set, get) => ({
  viewState: 'start',
  game: null,
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

  ...createLobbyActions(set, get),
  ...createPlayActions(set, get),
  ...createSyncActions(set, get),
}));