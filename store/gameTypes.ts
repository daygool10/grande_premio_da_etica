import { questions } from '../data/questions';
import type { GameRow, PlayerRow, AnswerRow } from '../lib/database.types';

export interface Game extends GameRow {
  race_length?: number | null;
}

type Player = PlayerRow;
type Answer = AnswerRow;

type ViewState = 'start' | 'admin_game_code' | 'admin_waiting' | 'admin_playing' | 'admin_finished' | 'player_join' | 'player_setup' | 'player_waiting' | 'player_playing' | 'player_finished' | 'player_penalty';
type SetupPlayerResult = 'success' | 'team_taken' | 'error';
type JoinGameResult = { status: 'success' } | { status: 'not_found' } | { status: 'error' };

export interface GameStore {
  viewState: ViewState;
  game: Game | null;
  players: Player[];
  currentPlayer: Player | null;
  answers: Answer[];
  selectedOption: number | null;
  hasAnswered: boolean;
  currentQuestion: typeof questions[0] | null;
  showResult: boolean;
  resultMessage: string;
  isPenalty: boolean;
  penaltyMessage: string;
  finishedPlayers: Player[];
  
  setViewState: (state: ViewState) => void;
  createGame: () => Promise<void>;
  joinGame: (gameCode: string) => Promise<JoinGameResult>;
  setRaceLength: (raceLength: number) => Promise<void>;
  setupPlayer: (teamName: string, f1Team: string) => Promise<SetupPlayerResult>;
  selectOption: (optionIndex: number) => void;
  submitAnswer: () => Promise<void>;
  revealAnswer: () => Promise<void>;
  nextQuestion: () => Promise<void>;
  startGame: () => Promise<void>;
  subscribeToGame: () => () => void;
  loadGameState: () => Promise<void>;
}

export type GameStoreSet = (partial: Partial<GameStore>) => void;

export type GameStoreGet = () => GameStore;