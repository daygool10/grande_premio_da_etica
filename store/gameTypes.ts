import { questions } from '../data/questions';

export interface Player {
  id: string;
  game_id: string;
  team_name: string;
  f1_team: string;
  position: number;
  skipped_turn: boolean;
  is_connected: boolean;
  last_seen: string;
}

export interface Game {
  id: string;
  game_code: string;
  admin_id: string;
  current_question_index: number;
  question_order?: number[] | null;
  phase: string;
  question_revealed: boolean;
}

export interface Answer {
  id: string;
  game_id: string;
  player_id: string;
  question_index: number;
  selected_option: number;
  is_correct: boolean;
  created_at?: string;
}

type ViewState = 'start' | 'admin_game_code' | 'admin_waiting' | 'admin_playing' | 'admin_finished' | 'player_join' | 'player_setup' | 'player_waiting' | 'player_playing' | 'player_finished' | 'player_penalty';
type SetupPlayerResult =
  | 'success'
  | 'team_taken'
  | 'game_started'
  | 'migration_required'
  | 'permission_denied'
  | 'error';
export const PLAYER_SESSION_KEY = 'f1-ethics-player-session';
export const ADMIN_ID_PREFIX = 'f1-ethics-admin-';
export const DATABASE_SCHEMA_ERROR =
  'A estrutura do banco de dados está desatualizada. Execute o docker-compose e tente novamente.';

export interface PlayerSession {
  playerId: string;
  gameId: string;
  gameCode: string;
  teamName: string;
  f1Team: string;
  sessionToken: string;
}

export interface GameStore {
  viewState: ViewState;
  game: Game | null;
  streamFallback: boolean;
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
  recoveryCandidate: PlayerSession | null;
  isCheckingRecovery: boolean;
  recoveryError: string;
  
  setViewState: (state: ViewState) => void;
  createGame: () => Promise<void>;
  joinGame: (gameCode: string) => Promise<boolean>;
  setupPlayer: (teamName: string, f1Team: string) => Promise<SetupPlayerResult>;
  selectOption: (optionIndex: number) => void;
  submitAnswer: () => Promise<void>;
  revealAnswer: () => Promise<void>;
  nextQuestion: () => Promise<void>;
  startGame: () => Promise<void>;
  subscribeToGame: () => () => void;
  loadGameState: () => Promise<void>;
  checkPlayerRecovery: () => Promise<void>;
  resumePlayerSession: () => Promise<void>;
  startFreshPlayerSession: () => Promise<boolean>;
  removeOfflinePlayer: (playerId: string) => Promise<boolean>;
  heartbeatPlayer: (playerId: string) => Promise<void>;
}

export type GameStoreSet = (partial: Partial<GameStore>) => void;

export type GameStoreGet = () => GameStore;