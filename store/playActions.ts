import { supabase } from '../lib/supabase';
import { questions } from '../data/questions';
import { applyScore, rankCorrectAnswersForQuestion, scoreForQuestion } from '../lib/scoring';
import { activeRaceLength, raceFinishLine } from './raceProgress';
import type { GameStore, GameStoreSet, GameStoreGet } from './gameTypes';

export function createPlayActions(set: GameStoreSet, get: GameStoreGet): Pick<GameStore, 'revealAnswer' | 'nextQuestion'> {
  return {
  revealAnswer: async () => {
    const { game } = get();
    if (!game || game.question_revealed) return;

    const question = questions[game.current_question_index];
    if (!question) {
      throw new Error(`Question ${game.current_question_index} was not found.`);
    }

    const { data: revealedGame, error: revealError } = await supabase
      .from('games')
      .update({ question_revealed: true })
      .eq('id', game.id)
      .eq('current_question_index', game.current_question_index)
      .eq('question_revealed', false)
      .select('id')
      .maybeSingle();

    if (revealError) throw revealError;
    if (!revealedGame) return;

    const [{ data: gamePlayers, error: playersError }, { data: questionAnswers, error: answersError }] = await Promise.all([
      supabase
        .from('players')
        .select('id, position, skipped_turn')
        .eq('game_id', game.id),
      supabase
        .from('answers')
        .select('player_id, selected_option, is_correct, answered_at, question_index')
        .eq('game_id', game.id)
        .eq('question_index', game.current_question_index),
    ]);

    if (playersError) throw playersError;
    if (answersError) throw answersError;
    if (!gamePlayers?.length) {
      throw new Error('Cannot reveal an answer without players in this game.');
    }

    const answersByPlayer = new Map(questionAnswers?.map((answer) => [answer.player_id, answer]));
    const eligiblePlayers = gamePlayers.filter((player) => !player.skipped_turn);
    if (eligiblePlayers.some((player) => !answersByPlayer.has(player.id))) {
      throw new Error('Cannot reveal an answer until every player has submitted one.');
    }

    const speedRanks = rankCorrectAnswersForQuestion(questionAnswers ?? [], game.current_question_index);

    const playerUpdates = gamePlayers.map((player) => {
      if (player.skipped_turn) {
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

      const rank = speedRanks.get(player.id) ?? 0;
      const delta = scoreForQuestion(option, rank);
      const position = applyScore(player.position, delta);

      return {
        id: player.id,
        position,
        skipped_turn: option.penaltyType === 'skip'
          ? true
          : player.skipped_turn,
      };
    });

    const updateResults = await Promise.all(playerUpdates.map(({ id, position, skipped_turn }) =>
      supabase
        .from('players')
        .update({ position, skipped_turn })
        .eq('id', id),
    ));
    const failedUpdate = updateResults.find((result) => result.error);
    if (failedUpdate?.error) throw failedUpdate.error;

    await get().loadGameState();
  },

  nextQuestion: async () => {
    const { game } = get();
    if (!game) return;

    const raceLength = activeRaceLength(game);
    const finishLine = raceFinishLine(game);
    const nextIndex = game.current_question_index + 1;

    const [{ data: playersToCheck, error: playersError }, { data: currentAnswers, error: answersError }] = await Promise.all([
      supabase
        .from('players')
        .select('id, position')
        .eq('game_id', game.id)
        .eq('skipped_turn', true),
      supabase
        .from('answers')
        .select('player_id')
        .eq('game_id', game.id)
        .eq('question_index', game.current_question_index),
    ]);

    if (playersError) throw playersError;
    if (answersError) throw answersError;

    const answeredPlayerIds = new Set(currentAnswers?.map((answer) => answer.player_id));
    const playersToUnskip = (playersToCheck ?? [])
      .filter((player) => player.position < finishLine && !answeredPlayerIds.has(player.id))
      .map((player) => player.id);

    const { data: updatedGame, error: gameError } = await supabase
      .from('games')
      .update({
        current_question_index: nextIndex,
        question_revealed: false,
        phase: nextIndex >= raceLength ? 'finished' : 'question',
      })
      .eq('id', game.id)
      .eq('current_question_index', game.current_question_index)
      .eq('question_revealed', true)
      .select()
      .maybeSingle();

    if (gameError) throw gameError;
    if (!updatedGame) return;

    if (playersToUnskip.length > 0) {
      const { error: skippedPlayersError } = await supabase
        .from('players')
        .update({ skipped_turn: false })
        .eq('game_id', game.id)
        .in('id', playersToUnskip);

      if (skippedPlayersError) {
        console.error('Error clearing completed skipped turns:', skippedPlayersError);
        throw skippedPlayersError;
      }
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