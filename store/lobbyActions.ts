import { supabase } from '../lib/supabase';
import { DEFAULT_RACE_LENGTH } from '../data/questions';
import type { GameStore, GameStoreSet, GameStoreGet } from './gameTypes';

function generateGameCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function createLobbyActions(set: GameStoreSet, get: GameStoreGet): Pick<GameStore, 'setViewState' | 'createGame' | 'joinGame' | 'setRaceLength' | 'setupPlayer' | 'selectOption' | 'submitAnswer'> {
  return {
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

  };
}