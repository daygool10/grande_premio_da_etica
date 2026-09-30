import { database } from '../lib/database';
import { questions, getBoardSize, getQuestionAt } from '../data/questions';
import type { GameStore, GameStoreSet, GameStoreGet } from './gameTypes';

export function createPlayActions(set: GameStoreSet, get: GameStoreGet): Pick<GameStore, 'revealAnswer' | 'nextQuestion'> {
  return {
  revealAnswer: async () => {
    const { game, players: cachedPlayers } = get();
    if (!game || game.question_revealed) return;

    const boardSize = getBoardSize(game.question_order?.length ?? questions.length);
    const question = getQuestionAt(game.current_question_index, game.question_order);
    if (!question) {
      throw new Error(`Question ${game.current_question_index} was not found.`);
    }

    const [gamePlayers, questionAnswers] = await Promise.all([
      database.getPlayersByGame(game.id),
      database.getAnswersByGameAndQuestion(game.id, game.current_question_index),
    ]);

    if (!gamePlayers?.length) {
      throw new Error('Cannot reveal an answer without players in this game.');
    }

    const answersByPlayer = new Map(questionAnswers?.map((answer) => [answer.player_id, answer]));
    const eligiblePlayers = gamePlayers.filter(
      (player) => !player.skipped_turn && player.position < boardSize,
    );
    if (eligiblePlayers.some((player) => !answersByPlayer.has(player.id))) {
      throw new Error('Cannot reveal an answer until every player has submitted one.');
    }

    const cachedPlayersById = new Map(cachedPlayers.map((player) => [player.id, player]));
    const playerUpdates = gamePlayers.map((player) => {
      if (player.skipped_turn || player.position >= boardSize) {
        return {
          id: player.id,
          position: player.position,
          skipped_turn: player.skipped_turn,
        };
      }

      const answer = answersByPlayer.get(player.id);
      const option = answer ? question.options[answer.selected_option] : undefined;
      if (!option) {
        throw new Error(`Invalid answer option for player ${player.id}.`);
      }

      const cachedPlayer = cachedPlayersById.get(player.id);
      const startingPosition = cachedPlayer?.position ?? player.position;
      let position = startingPosition;
      if (option.isCorrect) {
        position = Math.min(startingPosition + option.advance, boardSize);
      } else {
        switch (option.penaltyType) {
          case 'back1':
            position = Math.max(0, startingPosition - 1);
            break;
          case 'back2':
            position = Math.max(0, startingPosition - 2);
            break;
          case 'start':
            position = 0;
            break;
        }
      }

      return {
        id: player.id,
        position,
        skipped_turn: option.penaltyType === 'skip'
          ? true
          : (cachedPlayer?.skipped_turn ?? player.skipped_turn),
      };
    });

    await database.batchUpdatePlayers(playerUpdates);

    await database.updateGame(game.id, { question_revealed: true });
    await get().loadGameState();
  },

  nextQuestion: async () => {
    const { game } = get();
    if (!game) return;

    const boardSize = getBoardSize(game.question_order?.length ?? questions.length);
    const nextIndex = game.current_question_index + 1;

    const [playersToCheck, currentAnswers] = await Promise.all([
      database.getPlayersByGame(game.id),
      database.getAnswersByGameAndQuestion(game.id, game.current_question_index),
    ]);

    const skippedPlayers = playersToCheck?.filter(p => p.skipped_turn) ?? [];
    const answeredPlayerIds = new Set(currentAnswers?.map((answer) => answer.player_id));
    const playersToUnskip = skippedPlayers
      .filter((player) => player.position < boardSize && !answeredPlayerIds.has(player.id))
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