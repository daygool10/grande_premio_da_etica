import { supabase } from '../lib/supabase';
import { questions } from '../data/questions';
import { raceFinishLine } from './raceProgress';
import { readSeat, clearSeat } from '../lib/seat';
import type { GameStore, GameStoreSet, GameStoreGet } from './gameTypes';

const VIEW_BY_PHASE: Record<string, Record<'admin' | 'player', GameStore['viewState']>> = {
  waiting: { admin: 'admin_waiting', player: 'player_waiting' },
  question: { admin: 'admin_playing', player: 'player_playing' },
  finished: { admin: 'admin_finished', player: 'player_finished' },
};

export function createSyncActions(set: GameStoreSet, get: GameStoreGet): Pick<GameStore, 'startGame' | 'loadGameState' | 'subscribeToGame' | 'restoreSeat'> {
  return {
  startGame: async () => {
    const { game } = get();
    if (!game) return;

    const { error } = await supabase
      .from('games')
      .update({ phase: 'question' })
      .eq('id', game.id);

    if (error) {
      console.error('Error starting game:', error);
      throw error;
    }
  },

  loadGameState: async () => {
    const { game, currentPlayer } = get();
    if (!game) return;

    const [
      { data: updatedGame },
      { data: players },
      { data: allAnswers },
    ] = await Promise.all([
      supabase
        .from('games')
        .select('*')
        .eq('id', game.id)
        .single(),
      supabase
        .from('players')
        .select('*')
        .eq('game_id', game.id),
      supabase
        .from('answers')
        .select('*')
        .eq('game_id', game.id),
    ]);

    if (updatedGame) {
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
    }

    if (players) {
      set({ players });
    }

    if (currentPlayer) {
      const updatedPlayer = players?.find((player) => player.id === currentPlayer.id);

      if (updatedPlayer) {
        set({ currentPlayer: updatedPlayer });
      }
    }

    if (allAnswers) {
      set({ answers: allAnswers });
    }

    if (updatedGame) {
      const q = questions[updatedGame.current_question_index] || null;
      set({ currentQuestion: q });

      if (currentPlayer) {
        const existingAnswer = allAnswers?.find(
          a => a.player_id === currentPlayer.id && a.question_index === updatedGame.current_question_index
        );

        if (existingAnswer) {
          set({ hasAnswered: true, selectedOption: existingAnswer.selected_option });
        }
      }

      const finished = players?.filter(p => p.position >= raceFinishLine(updatedGame)) || [];
      set({ finishedPlayers: finished });
    }
  },

  subscribeToGame: () => {
    const { game } = get();
    if (!game) return () => {};

    const gameChannel = supabase
      .channel(`game-${game.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${game.id}` }, () => {
        get().loadGameState();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${game.id}` }, () => {
        get().loadGameState();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answers', filter: `game_id=eq.${game.id}` }, () => {
        get().loadGameState();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(gameChannel);
    };
  },

  restoreSeat: async () => {
    const seat = readSeat();
    if (!seat) return false;

    try {
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', seat.gameId)
        .maybeSingle();

      if (gameError) {
        console.error('Error fetching game for seat restore:', gameError);
        return false;
      }

      if (!game) {
        clearSeat();
        return false;
      }

      let currentPlayer: GameStore['currentPlayer'] = null;
      if (seat.role === 'player') {
        if (!seat.playerId) {
          clearSeat();
          return false;
        }
        const { data: player, error: playerError } = await supabase
          .from('players')
          .select('*')
          .eq('id', seat.playerId)
          .maybeSingle();
        if (playerError) {
          console.error('Error fetching player for seat restore:', playerError);
          return false;
        }
        if (!player) {
          clearSeat();
          return false;
        }
        currentPlayer = player;
      }

      const phaseView = VIEW_BY_PHASE[game.phase] ?? { admin: 'admin_waiting', player: 'player_waiting' };
      set({ game, currentPlayer, viewState: phaseView[seat.role] });
      return true;
    } catch (error) {
      console.error('Unexpected error during seat restore:', error);
      return false;
    }
  },

  };
}