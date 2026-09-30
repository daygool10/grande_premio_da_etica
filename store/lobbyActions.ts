import { database } from '../lib/database';
import { createQuestionOrder } from '../data/questions';
import { PLAYER_SESSION_KEY, ADMIN_ID_PREFIX, PlayerSession } from './gameTypes';
import type { GameStore, GameStoreSet, GameStoreGet } from './gameTypes';

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

export function createLobbyActions(set: GameStoreSet, get: GameStoreGet): Pick<GameStore, 'setViewState' | 'createGame' | 'joinGame' | 'setupPlayer' | 'selectOption' | 'submitAnswer'> {
  return {
  setViewState: (state) => set({ viewState: state }),

  createGame: async () => {
    const gameCode = generateGameCode();
    const adminId = Math.random().toString(36).substring(7);
    const adminSessionToken = generateSessionToken();
    const questionOrder = createQuestionOrder();
    
    const game = await database.createGame({
      game_code: gameCode,
      admin_id: adminId,
      admin_session_token: adminSessionToken,
      phase: 'waiting',
      current_question_index: 0,
      question_order: questionOrder,
      question_revealed: false,
    });

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`${ADMIN_ID_PREFIX}${game.id}`, adminSessionToken);
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
        skipped_turn: false,
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
    } catch (error) {
      console.error('Error creating player:', error);
      const code = (error as { code?: string } | null)?.code;
      if (code === 'P0001') return 'game_started';
      if (code === '23505') {
        await get().loadGameState();
        return 'team_taken';
      }
      return 'error';
    }
  },

  selectOption: (optionIndex: number) => {
    if (get().hasAnswered) return;
    set({ selectedOption: optionIndex });
  },

  submitAnswer: async () => {
    const { game, currentPlayer, selectedOption, currentQuestion } = get();
    if (!game || !currentPlayer || selectedOption === null || !currentQuestion) return;
    const option = currentQuestion.options[selectedOption];
    
    // Optimistic update - set state immediately
    set({
      hasAnswered: true,
      showResult: false,
      selectedOption: selectedOption,
    });

    try {
      const result = await database.createAnswer({
        game_id: game.id,
        player_id: currentPlayer.id,
        question_index: game.current_question_index,
        selected_option: selectedOption,
        is_correct: option.isCorrect,
      });

      if (result.status === 'already_answered') {
        return;
      }

      set({
        hasAnswered: true,
        showResult: false,
        resultMessage: '',
        isPenalty: false,
        penaltyMessage: '',
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
      set({ hasAnswered: false, showResult: false });
    }
  },

  };
}