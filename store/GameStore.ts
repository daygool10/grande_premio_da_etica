import { create } from 'zustand';
import { chooseQuestionOrder } from '../lib/questionOrder';
import {
  database,
  type BankOptionInput,
  type BankQuestion,
  type ClassificationEntry,
  type DealtQuestion,
  type RevealDelta,
} from '../lib/database';

interface Player {
  id: string;
  game_id: string;
  team_name: string;
  f1_team: string;
  position: number;
  is_connected: boolean;
  last_seen: string;
}

interface Game {
  id: string;
  game_code: string;
  admin_id: string;
  current_question_index: number;
  question_order?: number[] | null;
  phase: string;
  question_revealed: boolean;
}

interface Answer {
  id: string;
  game_id: string;
  player_id: string;
  question_index: number;
  selected_option: number;
  is_correct: boolean | null;
  response_time_ms: number | null;
  created_at?: string;
}

type ViewState = 'start' | 'admin_game_code' | 'admin_waiting' | 'admin_playing' | 'admin_finished' | 'player_join' | 'player_setup' | 'player_waiting' | 'player_playing' | 'player_finished';
type SetupPlayerResult =
  | 'success'
  | 'team_taken'
  | 'game_started'
  | 'migration_required'
  | 'permission_denied'
  | 'error';
const PLAYER_SESSION_KEY = 'f1-ethics-player-session';
const ADMIN_ID_PREFIX = 'f1-ethics-admin-';
const ADMIN_SESSION_KEY = 'f1-ethics-admin-session';
export const DATABASE_SCHEMA_ERROR =
  'A estrutura do banco de dados está desatualizada. Execute o docker-compose e tente novamente.';

interface PlayerSession {
  playerId: string;
  gameId: string;
  gameCode: string;
  teamName: string;
  f1Team: string;
  sessionToken: string;
}

interface AdminSession {
  gameId: string;
  viewState: Extract<ViewState, `admin_${string}`>;
}

function readAdminToken(gameId: string | undefined): string | null {
  if (typeof window === 'undefined' || !gameId) return null;
  return window.localStorage.getItem(`${ADMIN_ID_PREFIX}${gameId}`);
}

interface GameStore {
  viewState: ViewState;
  bankQuestions: BankQuestion[];
  bankError: string;
  cleanupSummary: string;
  isCleaning: boolean;
  game: Game | null;
  players: Player[];
  currentPlayer: Player | null;
  answers: Answer[];
  revealedAnswers: Answer[];
  selectedOption: number | null;
  hasAnswered: boolean;
  dealtQuestions: DealtQuestion[];
  answerKey: number | null;
  classification: ClassificationEntry[];
  revealDeltas: RevealDelta[];
  currentQuestion: DealtQuestion | null;
  showResult: boolean;
  resultMessage: string;
  finishedPlayers: Player[];
  recoveryCandidate: PlayerSession | null;
  isCheckingRecovery: boolean;
  recoveryError: string;
  realtimeStatus: string;
  
  setViewState: (state: ViewState) => void;
  loadBankQuestions: () => Promise<void>;
  saveBankQuestion: (
    questionId: number | null,
    title: string,
    scenario: string,
    options: BankOptionInput[],
  ) => Promise<boolean>;
  deleteBankQuestion: (questionId: number) => Promise<boolean>;
  cleanupGames: (keepNewest: number, emptyLobbyMinutes: number, abandonedHours: number) => Promise<boolean>;
  returnToHome: () => void;
  createGame: (raceLength?: number | null) => Promise<void>;
  joinGame: (gameCode: string) => Promise<boolean>;
  setupPlayer: (teamName: string, f1Team: string) => Promise<SetupPlayerResult>;
  selectOption: (optionIndex: number) => void;
  submitAnswer: () => Promise<void>;
  revealAnswer: () => Promise<void>;
  loadClassification: () => Promise<void>;
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

function generateGameCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function isSameGameSnapshot(current: Game | null, snapshot: Game): boolean {
  return current?.id === snapshot.id &&
    current.current_question_index === snapshot.current_question_index &&
    current.phase === snapshot.phase &&
    current.question_revealed === snapshot.question_revealed;
}

export const useGameStore = create<GameStore>((set, get) => ({
  viewState: 'start',
  game: null,
  players: [],
  currentPlayer: null,
  answers: [],
  revealedAnswers: [],
  dealtQuestions: [],
  answerKey: null,
  classification: [],
  revealDeltas: [],
  selectedOption: null,
  hasAnswered: false,
  currentQuestion: null,
  showResult: false,
  resultMessage: '',
  finishedPlayers: [],
  recoveryCandidate: null,
  isCheckingRecovery: false,
  recoveryError: '',
  realtimeStatus: 'DISCONNECTED',
  bankQuestions: [],
  bankError: '',
  cleanupSummary: '',
  isCleaning: false,

  loadBankQuestions: async () => {
    const { game } = get();
    const adminToken = readAdminToken(game?.id);
    if (!game || !adminToken) {
      set({ bankError: 'Sessão de administrador ausente nesta partida.' });
      return;
    }
    try {
      set({ bankQuestions: await database.listBankQuestions(game.id, adminToken), bankError: '' });
    } catch (error) {
      console.error('Error loading the question bank:', error);
      set({ bankError: 'Não foi possível carregar o banco de perguntas.' });
    }
  },

  saveBankQuestion: async (questionId, title, scenario, options) => {
    const { game } = get();
    const adminToken = readAdminToken(game?.id);
    if (!game || !adminToken) {
      set({ bankError: 'Sessão de administrador ausente nesta partida.' });
      return false;
    }
    try {
      const saved = await database.saveBankQuestion(game.id, adminToken, questionId, title, scenario, options);
      await get().loadBankQuestions();
      set({ bankError: '' });
      return saved.id > 0;
    } catch (error) {
      console.error('Error saving the question:', error);
      const message = error instanceof Error ? error.message : '';
      set({
        bankError: message.includes('race in progress')
          ? 'Esta pergunta está numa corrida em andamento e não pode mudar agora.'
          : 'Não foi possível salvar a pergunta. Confira os campos e tente novamente.',
      });
      return false;
    }
  },

  cleanupGames: async (keepNewest, emptyLobbyMinutes, abandonedHours) => {
    const { game } = get();
    const adminToken = readAdminToken(game?.id);
    if (!game || !adminToken) {
      set({ bankError: 'Sessão de administrador ausente nesta partida.' });
      return false;
    }
    set({ isCleaning: true, cleanupSummary: '' });
    try {
      const summary = await database.cleanupGames(
        game.id, adminToken, keepNewest, emptyLobbyMinutes, abandonedHours);
      set({
        cleanupSummary: summary.deleted === 0
          ? 'Nada para limpar: nenhuma partida abandonada.'
          : `${summary.deleted} partida(s) apagada(s), sobraram ${summary.games_after}.`,
      });
      return true;
    } catch (error) {
      console.error('Error cleaning up games:', error);
      set({ cleanupSummary: 'Não foi possível limpar agora. Tente novamente.' });
      return false;
    } finally {
      set({ isCleaning: false });
    }
  },

  deleteBankQuestion: async (questionId) => {
    const { game } = get();
    const adminToken = readAdminToken(game?.id);
    if (!game || !adminToken) {
      set({ bankError: 'Sessão de administrador ausente nesta partida.' });
      return false;
    }
    try {
      const result = await database.deleteBankQuestion(game.id, adminToken, questionId);
      await get().loadBankQuestions();
      set({ bankError: '' });
      return result.deleted;
    } catch (error) {
      console.error('Error deleting the question:', error);
      const message = error instanceof Error ? error.message : '';
      set({
        bankError: message.includes('race in progress')
          ? 'Esta pergunta está numa corrida em andamento e não pode ser apagada agora.'
          : 'Não foi possível apagar a pergunta.',
      });
      return false;
    }
  },

  setViewState: (state) => {
    const { game } = get();
    if (typeof window !== 'undefined') {
      if (state.startsWith('admin_') && game) {
        const adminSessionToken = window.localStorage.getItem(`${ADMIN_ID_PREFIX}${game.id}`);
        if (adminSessionToken) {
          const session: AdminSession = { gameId: game.id, viewState: state as AdminSession['viewState'] };
          window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
        }
      } else if (state === 'start') {
        window.localStorage.removeItem(ADMIN_SESSION_KEY);
      }
    }
    set({ viewState: state });
  },

  returnToHome: () => {
    const { game } = get();
    if (typeof window !== 'undefined') {
      if (game) window.localStorage.removeItem(`${ADMIN_ID_PREFIX}${game.id}`);
      window.localStorage.removeItem(ADMIN_SESSION_KEY);
      window.localStorage.removeItem(PLAYER_SESSION_KEY);
    }

    set({
      viewState: 'start',
      game: null,
      players: [],
      currentPlayer: null,
      answers: [],
  revealedAnswers: [],
      dealtQuestions: [],
      answerKey: null,
      classification: [],
      revealDeltas: [],
      selectedOption: null,
      hasAnswered: false,
      currentQuestion: null,
      showResult: false,
      resultMessage: '',
      finishedPlayers: [],
      recoveryCandidate: null,
      isCheckingRecovery: false,
      recoveryError: '',
    });
  },

  createGame: async (raceLength = null) => {
    const gameCode = generateGameCode();
    const adminId = Math.random().toString(36).substring(7);
    const adminSessionToken = generateSessionToken();
    // O host escolhe o comprimento; sem escolha, o servidor sorteia o banco inteiro.
    const questionOrder = raceLength === null
      ? null
      : chooseQuestionOrder(await database.listQuestionIds(), raceLength);
    const game = await database.createGame({
      game_code: gameCode,
      admin_id: adminId,
      admin_session_token: adminSessionToken,
      question_order: questionOrder,
      phase: 'waiting',
      current_question_index: 0,
      question_revealed: false,
    });

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`${ADMIN_ID_PREFIX}${game.id}`, adminSessionToken);
      const session: AdminSession = { gameId: game.id, viewState: 'admin_game_code' };
      window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    }
    set({ game, viewState: 'admin_game_code' });
  },

  joinGame: async (gameCode: string) => {
    const game = await database.getGameByCode(gameCode.toUpperCase());

    if (!game || game.phase !== 'waiting') {
      return false;
    }

    set({ game });
    return true;
  },

  setupPlayer: async (teamName: string, f1Team: string) => {
    const { game } = get();
    if (!game) return 'error';

    const latestGame = await database.getGameById(game.id);

    if (!latestGame || latestGame.phase !== 'waiting') return 'game_started';

    const existingPlayers = await database.getPlayersByGame(game.id);
    const teamTaken = existingPlayers.some(p => p.f1_team === f1Team);

    if (teamTaken) {
      await get().loadGameState();
      return 'team_taken';
    }

    const sessionToken = generateSessionToken();
    try {
      const player = await database.createPlayer({
        game_id: game.id,
        team_name: teamName,
        f1_team: f1Team,
        position: 0,
        is_connected: true,
        last_seen: new Date().toISOString(),
        player_session_token: sessionToken,
      });

      if (typeof window !== 'undefined') {
        const session: PlayerSession = {
          playerId: player.id,
          gameId: game.id,
          gameCode: game.game_code,
          teamName: player.team_name,
          f1Team: player.f1_team,
          sessionToken,
        };
        window.localStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify(session));
      }
      set({ currentPlayer: player, viewState: 'player_waiting' });
      return 'success';
    } catch (error: any) {
      console.error('Error creating player:', error);
      if (error.code === 'P0001') return 'game_started';
      if (error.code === '23505') {
        await get().loadGameState();
        return 'team_taken';
      }
      return 'error';
    }
  },

  checkPlayerRecovery: async () => {
    if (typeof window === 'undefined') return;
    set({ isCheckingRecovery: true, recoveryError: '' });
    try {
      const savedAdminSession = window.localStorage.getItem(ADMIN_SESSION_KEY);
      if (savedAdminSession) {
        let adminSession: AdminSession | null;
        try {
          adminSession = JSON.parse(savedAdminSession) as AdminSession;
          if (!adminSession.gameId || !adminSession.viewState?.startsWith('admin_')) {
            throw new Error('Invalid admin session');
          }
        } catch {
          window.localStorage.removeItem(ADMIN_SESSION_KEY);
          adminSession = null;
        }

        if (adminSession) {
          const adminSessionToken = window.localStorage.getItem(`${ADMIN_ID_PREFIX}${adminSession.gameId}`);
          if (!adminSessionToken) {
            window.localStorage.removeItem(ADMIN_SESSION_KEY);
          } else if (await database.adminSessionValid(adminSession.gameId, adminSessionToken)) {
            const game = await database.getGameById(adminSession.gameId);
            if (game) {
              const viewState: ViewState = game.phase === 'waiting'
                ? adminSession.viewState === 'admin_game_code' ? 'admin_game_code' : 'admin_waiting'
                : game.phase === 'finished' ? 'admin_finished' : 'admin_playing';
              set({ game, viewState });
              await get().loadGameState();
              return;
            }
            window.localStorage.removeItem(ADMIN_SESSION_KEY);
          } else {
            window.localStorage.removeItem(ADMIN_SESSION_KEY);
          }
        }
      }

      const stored = window.localStorage.getItem(PLAYER_SESSION_KEY);
      if (!stored) return;
      const session = JSON.parse(stored) as PlayerSession;
      if (!session.playerId || !session.gameId || !session.sessionToken) {
        window.localStorage.removeItem(PLAYER_SESSION_KEY);
        return;
      }

      const sessionValid = await database.playerHeartbeat(
        session.playerId,
        session.sessionToken
      );
      if (!sessionValid) {
        window.localStorage.removeItem(PLAYER_SESSION_KEY);
        return;
      }

      const [player, game] = await Promise.all([
        database.getPlayerByIdAndGame(session.playerId, session.gameId),
        database.getGameById(session.gameId),
      ]);
      if (!player || !game) {
        window.localStorage.removeItem(PLAYER_SESSION_KEY);
        return;
      }
      set({
        game,
        recoveryCandidate: {
          playerId: player.id,
          gameId: game.id,
          gameCode: game.game_code,
          teamName: player.team_name,
          f1Team: player.f1_team,
          sessionToken: session.sessionToken,
        },
      });
    } catch (error) {
      console.error('Error checking the saved player session:', error);
      set({ recoveryError: 'Não foi possível verificar sua partida salva. Verifique a conexão e tente novamente.' });
    } finally {
      set({ isCheckingRecovery: false });
    }
  },

  resumePlayerSession: async () => {
    const candidate = get().recoveryCandidate;
    if (!candidate) return;
    if (!candidate.sessionToken) {
      set({ recoveryError: 'A sessão local não contém uma credencial válida. Esta equipe pode ter sido removida da sala.' });
      return;
    }
    const sessionValid = await database.playerHeartbeat(
      candidate.playerId,
      candidate.sessionToken
    );
    if (!sessionValid) {
      set({ recoveryError: 'Não foi possível validar a sessão desta equipe. Tente novamente.' });
      return;
    }
    const [game, player] = await Promise.all([
      database.getGameById(candidate.gameId),
      database.getPlayerByIdAndGame(candidate.playerId, candidate.gameId),
    ]);
    if (!game || !player) {
      set({ recoveryError: 'Não foi possível restaurar esta partida. Tente novamente.' });
      return;
    }
    set({
      game,
      currentPlayer: player,
      recoveryCandidate: null,
      recoveryError: '',
      viewState: game.phase === 'waiting'
        ? 'player_waiting'
        : game.phase === 'finished'
          ? 'player_finished'
          : 'player_playing',
      hasAnswered: false,
      selectedOption: null,
      answerKey: null,
    });
    await get().loadGameState();
  },

  startFreshPlayerSession: async () => {
    const candidate = get().recoveryCandidate;
    if (!candidate) return false;
    const removed = await database.leaveWaitingPlayer(
      candidate.playerId,
      candidate.sessionToken
    );
    if (!removed) {
      set({
        recoveryError: 'Só é possível trocar de dupla enquanto a partida aguarda a largada. Sua equipe anterior foi mantida.',
      });
      return false;
    }
    if (typeof window !== 'undefined') window.localStorage.removeItem(PLAYER_SESSION_KEY);
    const game = await database.getGameById(candidate.gameId);
    if (!game || game.phase !== 'waiting') {
      set({
        recoveryError: 'A dupla anterior foi removida, mas a sala deixou de aceitar novas equipes antes da configuração terminar. Entre em outra partida.',
        recoveryCandidate: null,
      });
      return false;
    }
    set({
      game,
      currentPlayer: null,
      recoveryCandidate: null,
      recoveryError: '',
      viewState: 'player_setup',
    });
    await get().loadGameState();
    return true;
  },

  removeOfflinePlayer: async (playerId: string) => {
    const { game } = get();
    if (!game || game.phase !== 'waiting' || typeof window === 'undefined') return false;
    const adminSessionToken = window.localStorage.getItem(`${ADMIN_ID_PREFIX}${game.id}`);
    if (!adminSessionToken) return false;
    const removed = await database.removeOfflinePlayer(playerId, adminSessionToken);
    if (removed) await get().loadGameState();
    return removed;
  },

  heartbeatPlayer: async (playerId: string) => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(PLAYER_SESSION_KEY);
    const session = stored ? JSON.parse(stored) as PlayerSession : null;
    if (!session?.sessionToken || session.playerId !== playerId) return;
    const valid = await database.playerHeartbeat(playerId, session.sessionToken);
    if (!valid) {
      if (typeof window !== 'undefined') window.localStorage.removeItem(PLAYER_SESSION_KEY);
      set({ currentPlayer: null, viewState: 'player_join' });
    }
  },

  selectOption: (optionIndex: number) => {
    if (get().hasAnswered) return;
    set({ selectedOption: optionIndex });
  },

  submitAnswer: async () => {
    const { game, currentPlayer, selectedOption, currentQuestion } = get();
    if (!game || !currentPlayer || selectedOption === null || !currentQuestion) return;
    // Optimistic update - set state immediately
    set({
      hasAnswered: true,
      showResult: false,
      selectedOption: selectedOption,
    });

    try {
      await database.createAnswer({
        game_id: game.id,
        player_id: currentPlayer.id,
        question_index: game.current_question_index,
        selected_option: selectedOption,
      });

      set({
        hasAnswered: true,
        showResult: false,
        resultMessage: '',
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
      set({ hasAnswered: false, showResult: false });
    }
  },

  revealAnswer: async () => {
    const { game } = get();
    if (!game || game.question_revealed) return;

    const gamePlayers = await database.getPlayersByGame(game.id);

    if (!gamePlayers.length) {
      throw new Error('Cannot reveal an answer without players in this game.');
    }

    // O host pode pular a pergunta (decisão do dono). Revelar com duplas pendentes é legal: quem
    // não respondeu avança 0 no servidor e a corrida segue até o fim. Não há portão client-side.

    const adminToken = typeof window === 'undefined'
      ? null
      : window.localStorage.getItem(`${ADMIN_ID_PREFIX}${game.id}`);
    if (!adminToken) throw new Error('Admin session is missing.');
    const result = await database.revealQuestion(game.id, adminToken);
    if (result.status === 'already_revealed') return;
    const deltaByPlayer = new Map(result.deltas.map((delta) => [delta.player_id, delta]));
    set({
      game: { ...game, question_revealed: true },
      revealDeltas: result.deltas,
      players: get().players.map((player) => {
        const delta = deltaByPlayer.get(player.id);
        return delta ? { ...player, position: delta.position } : player;
      }),
      currentPlayer: get().currentPlayer
        ? (() => {
            const delta = deltaByPlayer.get(get().currentPlayer!.id);
            return delta ? { ...get().currentPlayer!, position: delta.position } : get().currentPlayer;
          })()
        : null,
    });
    const key = await database.getAnswerKey(game.id, result.question_index);
    set({ answerKey: key.option_index });
  },

  nextQuestion: async () => {
    const { game } = get();
    if (!game) return;

    const nextIndex = game.current_question_index + 1;

    const updatedGame = await database.updateGame(game.id, {
      current_question_index: nextIndex,
      question_revealed: false,
      phase: nextIndex >= get().dealtQuestions.length ? 'finished' : 'question',
    });

      set({
        game: updatedGame,
        answerKey: null,
        revealDeltas: [],
      showResult: false,
      hasAnswered: false,
      selectedOption: null,
      resultMessage: '',
    });
  },

  startGame: async () => {
    const { game } = get();
    if (!game) return;

    const startedGame = await database.updateGame(game.id, { phase: 'question' });
    set({ game: startedGame });
  },

  loadGameState: async () => {
    const { game, currentPlayer } = get();
    if (!game) return;

    const [updatedGame, dealtQuestions] = await Promise.all([
      database.getGameById(game.id),
      database.getDealtQuestions(game.id),
    ]);
    if (!updatedGame) return;

    const latestGame = get().game;
    if (
      latestGame?.id !== game.id ||
      updatedGame.current_question_index < latestGame.current_question_index ||
      (
        updatedGame.current_question_index === latestGame.current_question_index &&
        latestGame.question_revealed &&
        !updatedGame.question_revealed
      )
    ) {
      return;
    }

    const isNewQuestion =
      updatedGame.current_question_index > latestGame.current_question_index;
    set({
      game: updatedGame,
      dealtQuestions,
      currentQuestion: dealtQuestions[updatedGame.current_question_index] ?? null,
      ...(isNewQuestion
        ? {
            hasAnswered: false,
            selectedOption: null,
            showResult: false,
            resultMessage: '',
            answerKey: null,
            revealDeltas: [],
          }
        : {}),
    });

    const players = await database.getPlayersByGame(game.id);

    if (!isSameGameSnapshot(get().game, updatedGame)) return;

    if (players) {
      const latestGame = get().game;
      const isAnswerHidden = latestGame?.phase === 'question' && !latestGame.question_revealed;
      if (isAnswerHidden) {
        const cachedPlayersById = new Map(get().players.map((player) => [player.id, player]));
        set({
          players: players.map((player) => {
            const cachedPlayer = cachedPlayersById.get(player.id);
            return cachedPlayer
              ? { ...player, position: cachedPlayer.position }
              : player;
          }),
        });
      } else {
        set({ players });
      }
    }

    if (currentPlayer) {
      const updatedPlayer = await database.getPlayerById(currentPlayer.id);

      if (!isSameGameSnapshot(get().game, updatedGame)) return;

      if (updatedPlayer) {
        const latestGame = get().game;
        const isAnswerHidden = latestGame?.phase === 'question' && !latestGame.question_revealed;
        set({
          currentPlayer: isAnswerHidden
            ? { ...updatedPlayer, position: currentPlayer.position }
            : updatedPlayer,
        });
      }
    }

    // Load all answers for admin view
    const allAnswers = await database.getAnswersByGame(game.id);

    if (!isSameGameSnapshot(get().game, updatedGame)) return;

    if (allAnswers) {
      // Só a resposta REVELADA carrega o veredito (o servidor mascara is_correct antes da revelação).
      // revealedAnswers guarda essa cópia e NÃO é limpa ao avançar: é dela que a mensagem do
      // engenheiro tira acerto e tempo, em vez de deduzir qualquer coisa no navegador.
      set(updatedGame.question_revealed
        ? { answers: allAnswers, revealedAnswers: allAnswers }
        : { answers: allAnswers });
    }

    if (updatedGame) {
      if (currentPlayer) {
        const existingAnswer = allAnswers?.find(
          a => a.player_id === currentPlayer.id && a.question_index === updatedGame.current_question_index
        );

        if (existingAnswer) {
          set({ hasAnswered: true, selectedOption: existingAnswer.selected_option });
        }
      }

      set({ finishedPlayers: players ?? [] });
      if (updatedGame.phase === 'finished') await get().loadClassification();
    }
  },

  loadClassification: async () => {
    const { game } = get();
    if (!game) return;
    set({ classification: await database.getClassification(game.id) });
  },

  subscribeToGame: () => {
    const { game } = get();
    if (!game) return () => {};

    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let fallbackInterval: number | undefined;
    let unsubscribed = false;
    const scheduleRefresh = () => {
      if (refreshTimer !== undefined) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = undefined;
        void get().loadGameState();
      }, 120);
    };
    const startFallback = () => {
      if (fallbackInterval !== undefined) return;
      // Fail-safe only: realtime is the transport, but a lost websocket must not freeze a room.
      fallbackInterval = window.setInterval(() => void get().loadGameState(), 15_000);
    };
    const stopFallback = () => {
      if (fallbackInterval === undefined) return;
      clearInterval(fallbackInterval);
      fallbackInterval = undefined;
    };

    startFallback();
    const unsubscribeRealtime = database.subscribeToGameChanges(game.id, {
      onChange: scheduleRefresh,
      onStatus: (status) => {
        set({ realtimeStatus: status });
        if (status === 'SUBSCRIBED') stopFallback();
        else if (!unsubscribed) startFallback();
      },
    });

    return () => {
      unsubscribed = true;
      unsubscribeRealtime();
      stopFallback();
      if (refreshTimer !== undefined) clearTimeout(refreshTimer);
    };
  },
}));
