import { database } from '../lib/database';
import { PLAYER_SESSION_KEY, ADMIN_ID_PREFIX, PlayerSession } from './gameTypes';
import type { GameStore, GameStoreSet, GameStoreGet } from './gameTypes';

export function createSessionActions(set: GameStoreSet, get: GameStoreGet): Pick<GameStore, 'checkPlayerRecovery' | 'resumePlayerSession' | 'startFreshPlayerSession' | 'removeOfflinePlayer' | 'heartbeatPlayer'> {
  return {
  checkPlayerRecovery: async () => {
    if (typeof window === 'undefined') return;
    set({ isCheckingRecovery: true, recoveryError: '' });
    try {
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

  };
}