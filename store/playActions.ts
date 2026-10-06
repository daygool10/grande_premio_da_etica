import { database } from '../lib/database';
import { questions } from '../data/questions';
import { finishLineForOrder } from '../server/shared/scoring.js';
import type { GameStore, GameStoreSet, GameStoreGet } from './gameTypes';

export function createPlayActions(set: GameStoreSet, get: GameStoreGet): Pick<GameStore, 'revealAnswer' | 'nextQuestion'> {
  return {
  revealAnswer: async () => {
    const { game } = get();
    if (!game || game.question_revealed) return;

    // O fechamento da rodada agora é do servidor:
    // POST /games/:id/reveal valida o admin, tranca a
    // partida, confere as respostas e grava as posições
    // numa transação. O cliente só exibe o resultado.
    const result = await database.revealQuestion(game.id);
    set({ lastReveal: result });
    await get().loadGameState();
  },

  nextQuestion: async () => {
    const { game } = get();
    if (!game) return;

    const finishLine = finishLineForOrder(game.question_order, questions);
    const nextIndex = game.current_question_index + 1;

    const [playersToCheck, currentAnswers] = await Promise.all([
      database.getPlayersByGame(game.id),
      database.getAnswersByGameAndQuestion(game.id, game.current_question_index),
    ]);

    const skippedPlayers = playersToCheck?.filter(p => p.skipped_turn) ?? [];
    const answeredPlayerIds = new Set(currentAnswers?.map((answer) => answer.player_id));
    const playersToUnskip = skippedPlayers
      .filter((player) => player.position < finishLine && !answeredPlayerIds.has(player.id))
      .map((player) => player.id);

    const updatedGame = await database.updateGame(game.id, {
      current_question_index: nextIndex,
      question_revealed: false,
      phase: nextIndex >= (game.question_order?.length ?? questions.length) ? 'finished' : 'question',
    });

    if (playersToUnskip.length > 0) {
      const unskipUpdates = playersToUnskip.map(id => ({
        id,
        position: playersToCheck.find(p => p.id === id)?.position ?? 0,
        skipped_turn: false,
      }));
      await database.batchUpdatePlayers(game.id, unskipUpdates);
    }

    const currentPlayer = get().currentPlayer;
    set({
      game: updatedGame,
      showResult: false,
      hasAnswered: false,
      selectedOption: null,
      resultMessage: '',
      isPenalty: false,
      penaltyMessage: '',
      answers: [],
      players: get().players.map((player) => ({
        ...player,
        skipped_turn: playersToUnskip.includes(player.id) ? false : player.skipped_turn,
      })),
      ...(currentPlayer && playersToUnskip.includes(currentPlayer.id)
        ? { currentPlayer: { ...currentPlayer, skipped_turn: false } }
        : {}),
    });
  },

  };
}