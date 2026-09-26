import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { questions, DEFAULT_RACE_LENGTH } from '../data/questions';
import {
  applyScore,
  raceTarget,
  rankCorrectAnswersForQuestion,
  scoreForQuestion,
} from '../lib/scoring';
import type { GameRow, PlayerRow, AnswerRow } from '../lib/database.types';

interface Game extends GameRow {
  race_length?: number | null;
}

type Player = PlayerRow;
type Answer = AnswerRow;

export function activeRaceLength(game: Pick<Game, 'race_length'> | null | undefined): number {
  if (game && typeof game.race_length === 'number' && game.race_length > 0) {
    return game.race_length;
  }
  return DEFAULT_RACE_LENGTH;
}

export function raceFinishLine(game: Pick<Game, 'race_length'> | null | undefined): number {
  return raceTarget(questions, activeRaceLength(game));
}

type ViewState = 'start' | 'admin_game_code' | 'admin_waiting' | 'admin_playing' | 'admin_finished' | 'player_join' | 'player_setup' | 'player_waiting' | 'player_playing' | 'player_finished' | 'player_penalty';
type SetupPlayerResult = 'success' | 'team_taken' | 'error';
type JoinGameResult = { status: 'success' } | { status: 'not_found' } | { status: 'error' };

interface GameStore {
  viewState: ViewState;
  game: Game | null;
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
  
  setViewState: (state: ViewState) => void;
  createGame: () => Promise<void>;
  joinGame: (gameCode: string) => Promise<JoinGameResult>;
  setRaceLength: (raceLength: number) => Promise<void>;
  setupPlayer: (teamName: string, f1Team: string) => Promise<SetupPlayerResult>;
  selectOption: (optionIndex: number) => void;
  submitAnswer: () => Promise<void>;
  revealAnswer: () => Promise<void>;
  nextQuestion: () => Promise<void>;
  startGame: () => Promise<void>;
  subscribeToGame: () => () => void;
  loadGameState: () => Promise<void>;
}

function generateGameCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const useGameStore = create<GameStore>((set, get) => ({
  viewState: 'start',
  game: null,
  players: [],
  currentPlayer: null,
  answers: [],
  selectedOption: null,
  hasAnswered: false,
  currentQuestion: null,
  showResult: false,
  resultMessage: '',
  isPenalty: false,
  penaltyMessage: '',
  finishedPlayers: [],

  setViewState: (state) => set({ viewState: state }),

  createGame: async () => {
    const gameCode = generateGameCode();
    const adminId = Math.random().toString(36).substring(7);
    
    const { data: game, error } = await supabase
      .from('games')
      .insert({
        game_code: gameCode,
        admin_id: adminId,
        phase: 'waiting',
        current_question_index: 0,
        question_revealed: false,
        race_length: DEFAULT_RACE_LENGTH,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating game:', error);
      throw error;
    }

    set({ game: { ...game, race_length: game.race_length ?? DEFAULT_RACE_LENGTH }, viewState: 'admin_game_code' });
  },

  joinGame: async (gameCode: string) => {
    const { data: games, error } = await supabase
      .from('games')
      .select('*')
      .eq('game_code', gameCode.toUpperCase())
      .maybeSingle();

    if (error) {
      console.error('Error joining game:', error);
      return { status: 'error' };
    }

    if (!games) {
      return { status: 'not_found' };
    }

    set({ game: games });
    return { status: 'success' };
  },

  setRaceLength: async (raceLength: number) => {
    const { game } = get();
    if (!game) return;

    const { error } = await supabase
      .from('games')
      .update({ race_length: raceLength })
      .eq('id', game.id);

    if (error) {
      console.error('Could not persist race_length to the games table:', error);
    }

    set({ game: { ...game, race_length: raceLength } });
  },

  setupPlayer: async (teamName: string, f1Team: string) => {
    const { game } = get();
    if (!game) return 'error';

    const { data: existingPlayers, error: lookupError } = await supabase
      .from('players')
      .select('id')
      .eq('game_id', game.id)
      .eq('f1_team', f1Team)
      .limit(1);

    if (lookupError) {
      console.error('Error checking selected F1 team:', lookupError);
      return 'error';
    }

    if (existingPlayers.length > 0) {
      await get().loadGameState();
      return 'team_taken';
    }

    const { data: player, error } = await supabase
      .from('players')
      .insert({
        game_id: game.id,
        team_name: teamName,
        f1_team: f1Team,
        position: 0,
        skipped_turn: false,
        is_connected: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating player:', error);
      if (error.code === '23505') {
        await get().loadGameState();
        return 'team_taken';
      }
      return 'error';
    }

    set({ currentPlayer: player, viewState: 'player_waiting' });
    return 'success';
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

    const { error } = await supabase
      .from('answers')
      .insert({
        game_id: game.id,
        player_id: currentPlayer.id,
        question_index: game.current_question_index,
        selected_option: selectedOption,
        is_correct: option.isCorrect,
      });

    if (error) {
      console.error('Error submitting answer:', error);
      set({ hasAnswered: false, showResult: false });
      return;
    }

    set({
      hasAnswered: true,
      showResult: false,
      resultMessage: '',
      isPenalty: false,
      penaltyMessage: '',
    });

  },

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

    const { data: updatedGame } = await supabase
      .from('games')
      .select('*')
      .eq('id', game.id)
      .single();

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

    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', game.id);

    if (players) {
      set({ players });
    }

    if (currentPlayer) {
      const { data: updatedPlayer } = await supabase
        .from('players')
        .select('*')
        .eq('id', currentPlayer.id)
        .single();

      if (updatedPlayer) {
        set({ currentPlayer: updatedPlayer });
      }
    }

    // Load all answers for admin view
    const { data: allAnswers } = await supabase
      .from('answers')
      .select('*')
      .eq('game_id', game.id);
    
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
}));
