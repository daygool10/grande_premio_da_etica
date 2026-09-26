import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { questions, BOARD_SIZE } from '../data/questions';

interface Player {
  id: string;
  game_id: string;
  team_name: string;
  f1_team: string;
  position: number;
  skipped_turn: boolean;
  is_connected: boolean;
}

interface Game {
  id: string;
  game_code: string;
  admin_id: string;
  current_question_index: number;
  phase: string;
  question_revealed: boolean;
}

interface Answer {
  id: string;
  game_id: string;
  player_id: string;
  question_index: number;
  selected_option: number;
  is_correct: boolean;
  created_at?: string;
}

type ViewState = 'start' | 'admin_game_code' | 'admin_waiting' | 'admin_playing' | 'admin_finished' | 'player_join' | 'player_setup' | 'player_waiting' | 'player_playing' | 'player_finished' | 'player_penalty';
type SetupPlayerResult = 'success' | 'team_taken' | 'error';

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
  joinGame: (gameCode: string) => Promise<boolean>;
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
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating game:', error);
      return;
    }

    set({ game, viewState: 'admin_game_code' });
  },

  joinGame: async (gameCode: string) => {
    const { data: games, error } = await supabase
      .from('games')
      .select('*')
      .eq('game_code', gameCode.toUpperCase())
      .single();

    if (error || !games) {
      return false;
    }

    set({ game: games });
    return true;
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
    const { game, players: cachedPlayers } = get();
    if (!game || game.question_revealed) return;

    const question = questions[game.current_question_index];
    if (!question) {
      throw new Error(`Question ${game.current_question_index} was not found.`);
    }

    const [{ data: gamePlayers, error: playersError }, { data: questionAnswers, error: answersError }] = await Promise.all([
      supabase
        .from('players')
        .select('id, position, skipped_turn')
        .eq('game_id', game.id),
      supabase
        .from('answers')
        .select('player_id, selected_option')
        .eq('game_id', game.id)
        .eq('question_index', game.current_question_index),
    ]);

    if (playersError) throw playersError;
    if (answersError) throw answersError;
    if (!gamePlayers?.length) {
      throw new Error('Cannot reveal an answer without players in this game.');
    }

    const answersByPlayer = new Map(questionAnswers?.map((answer) => [answer.player_id, answer]));
    const eligiblePlayers = gamePlayers.filter(
      (player) => !player.skipped_turn && player.position < BOARD_SIZE,
    );
    if (eligiblePlayers.some((player) => !answersByPlayer.has(player.id))) {
      throw new Error('Cannot reveal an answer until every player has submitted one.');
    }

    const cachedPlayersById = new Map(cachedPlayers.map((player) => [player.id, player]));
    const playerUpdates = gamePlayers.map((player) => {
      if (player.skipped_turn || player.position >= BOARD_SIZE) {
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
        position = Math.min(startingPosition + option.advance, BOARD_SIZE);
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

    const updateResults = await Promise.all(playerUpdates.map(({ id, position, skipped_turn }) =>
      supabase
        .from('players')
        .update({ position, skipped_turn })
        .eq('id', id),
    ));
    const failedUpdate = updateResults.find((result) => result.error);
    if (failedUpdate?.error) throw failedUpdate.error;

    const { data: revealedGame, error: revealError } = await supabase
      .from('games')
      .update({ question_revealed: true })
      .eq('id', game.id)
      .eq('current_question_index', game.current_question_index)
      .eq('question_revealed', false)
      .select('id')
      .maybeSingle();

    if (revealError) throw revealError;
    if (revealedGame) await get().loadGameState();
  },

  nextQuestion: async () => {
    const { game } = get();
    if (!game) return;

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
      .filter((player) => player.position < BOARD_SIZE && !answeredPlayerIds.has(player.id))
      .map((player) => player.id);

    const { data: updatedGame, error: gameError } = await supabase
      .from('games')
      .update({
        current_question_index: nextIndex,
        question_revealed: false,
        phase: nextIndex >= questions.length ? 'finished' : 'question',
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

    await supabase
      .from('games')
      .update({ phase: 'question' })
      .eq('id', game.id);
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
      const { data: updatedPlayer } = await supabase
        .from('players')
        .select('*')
        .eq('id', currentPlayer.id)
        .single();

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

      const finished = players?.filter(p => p.position >= BOARD_SIZE) || [];
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
