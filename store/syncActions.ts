import { database } from '../lib/database';
import { questions, getQuestionAt } from '../data/questions';
import { finishLineForOrder } from '../server/shared/scoring.js';
import { FALLBACK_POLL_INTERVAL_MS, openGameEventStream } from '../lib/gameEvents';
import { Game } from './gameTypes';
import type { GameStore, GameStoreSet, GameStoreGet } from './gameTypes';

function isSameGameSnapshot(current: Game | null, snapshot: Game): boolean {
  return current?.id === snapshot.id &&
    current.current_question_index === snapshot.current_question_index &&
    current.phase === snapshot.phase &&
    current.question_revealed === snapshot.question_revealed;
}

export function createSyncActions(set: GameStoreSet, get: GameStoreGet): Pick<GameStore, 'startGame' | 'loadGameState' | 'subscribeToGame'> {
  return {
  startGame: async () => {
    const { game } = get();
    if (!game) return;

    const startedGame = await database.updateGame(game.id, { phase: 'question' });
    set({ game: startedGame });
  },

  loadGameState: async () => {
    const { game, currentPlayer } = get();
    if (!game) return;

    const updatedGame = await database.getGameById(game.id);
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
      ...(isNewQuestion
        ? {
            hasAnswered: false,
            selectedOption: null,
            showResult: false,
            resultMessage: '',
            isPenalty: false,
            penaltyMessage: '',
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
      set({ answers: allAnswers });
    }

    if (updatedGame) {
      const q = getQuestionAt(
        updatedGame.current_question_index,
        updatedGame.question_order,
      );
      set({ currentQuestion: q });

      if (currentPlayer) {
        const existingAnswer = allAnswers?.find(
          a => a.player_id === currentPlayer.id && a.question_index === updatedGame.current_question_index
        );

        if (existingAnswer) {
          set({ hasAnswered: true, selectedOption: existingAnswer.selected_option });
        }
      }

      const finishLine = finishLineForOrder(updatedGame.question_order, questions);
      const finished = players?.filter(p => p.position >= finishLine) || [];
      set({ finishedPlayers: finished });
    }
  },

  subscribeToGame: () => {
    const { game } = get();
    if (!game) return () => {};

    let pollingTimer: number | null = null;
    let refreshing = false;
    let refreshAgain = false;

    const stopFallbackPolling = () => {
      if (pollingTimer !== null) {
        window.clearInterval(pollingTimer);
        pollingTimer = null;
      }
    };

    const startFallbackPolling = () => {
      if (pollingTimer === null) {
        pollingTimer = window.setInterval(() => {
          void get().loadGameState();
        }, FALLBACK_POLL_INTERVAL_MS);
      }
    };

    const refreshOnFrame = () => {
      if (refreshing) {
        refreshAgain = true;
        return;
      }
      refreshing = true;
      refreshAgain = false;
      void get().loadGameState().finally(() => {
        refreshing = false;
        if (refreshAgain) {
          refreshAgain = false;
          refreshOnFrame();
        }
      });
    };

    const stream = openGameEventStream({
      gameId: game.id,
      onEvent: (frame) => {
        if (frame.game_id !== game.id) return;
        refreshOnFrame();
      },
      onStatusChange: (status) => {
        if (status === 'fallback') {
          set({ streamFallback: true });
          startFallbackPolling();
        } else {
          set({ streamFallback: false });
          stopFallbackPolling();
        }
      },
    });

    return () => {
      set({ streamFallback: false });
      stopFallbackPolling();
      stream.close();
    };
  },

  };
}