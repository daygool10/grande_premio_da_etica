import { database } from '../lib/database';
import { questions, getQuestionAt } from '../data/questions';
import { finishLineForOrder, scoreReveal } from '../server/shared/scoring.js';
import type { GameStore, GameStoreSet, GameStoreGet } from './gameTypes';

export function createPlayActions(set: GameStoreSet, get: GameStoreGet): Pick<GameStore, 'revealAnswer' | 'nextQuestion'> {
  return {
  revealAnswer: async () => {
    const { game } = get();
    if (!game || game.question_revealed) return;

    const question = getQuestionAt(game.current_question_index, game.question_order);
    if (!question) {
      throw new Error(`Question ${game.current_question_index} was not found.`);
    }

    const finishLine = finishLineForOrder(game.question_order, questions);

    const [gamePlayers, questionAnswers] = await Promise.all([
      database.getPlayersByGame(game.id),
      database.getAnswersByGameAndQuestion(game.id, game.current_question_index),
    ]);

    if (!gamePlayers?.length) {
      throw new Error('Cannot reveal an answer without players in this game.');
    }

    const answersByPlayer = new Map(questionAnswers?.map((answer) => [answer.player_id, answer]));
    const eligiblePlayers = gamePlayers.filter(
      (player) => !player.skipped_turn && player.position < finishLine,
    );
    if (eligiblePlayers.some((player) => !answersByPlayer.has(player.id))) {
      throw new Error('Cannot reveal an answer until every player has submitted one.');
    }

    const playerUpdates = scoreReveal(
      question.options,
      gamePlayers,
      questionAnswers ?? [],
      game.current_question_index,
    );

    await database.batchUpdatePlayers(playerUpdates);
    await database.updateGame(game.id, { question_revealed: true });
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
      await database.batchUpdatePlayers(unskipUpdates);
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