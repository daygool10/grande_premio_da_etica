import { createClient } from '@supabase/supabase-js';

// ============================================
// Cliente Supabase
// ============================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[database] VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidas no .env'
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type GameChangeHandlers = {
  onChange: () => void;
  onStatus: (status: string) => void;
};

function subscribeToGameChanges(gameId: string, handlers: GameChangeHandlers): () => void {
  const channel = supabase.channel(`game:${gameId}`);
  let removed = false;
  const notifyChange = () => handlers.onChange();

  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, notifyChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` }, notifyChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'answers', filter: `game_id=eq.${gameId}` }, notifyChange)
    .subscribe((status) => handlers.onStatus(status));

  return () => {
    if (removed) return;
    removed = true;
    void supabase.removeChannel(channel);
  };
}

// ============================================
// Tipos (idênticos ao database.ts original)
// ============================================

interface Game {
  id: string;
  game_code: string;
  admin_id: string;
  current_question_index: number;
  question_order?: number[] | null;
  phase: string;
  question_revealed: boolean;
}

interface Player {
  id: string;
  game_id: string;
  team_name: string;
  f1_team: string;
  position: number;
  is_connected: boolean;
  last_seen: string;
}

export interface Answer {
  id: string;
  game_id: string;
  player_id: string;
  question_index: number;
  selected_option: number;
  is_correct: boolean | null;
  response_time_ms: number | null;
  created_at?: string;
}

export interface BankOption {
  option_index: number;
  option_text: string;
  is_correct: boolean;
}

export interface BankQuestion {
  id: number;
  title: string;
  scenario: string;
  position: number;
  options: BankOption[];
}

export interface BankOptionInput {
  option_text: string;
  is_correct: boolean;
}

export interface CleanupSummary {
  deleted: number;
  codes: string[];
  games_before: number;
  games_after: number;
}

export interface DealtQuestion {
  id: number;
  title: string;
  scenario: string;
  options: Array<{ option_index: number; text: string }>;
}

export interface RevealDelta {
  player_id: string;
  team_name: string;
  position: number;
  advance: number;
  response_time_ms: number | null;
}

export interface RevealResult {
  status: 'revealed' | 'already_revealed';
  revealed: true;
  question_index: number;
  deltas: RevealDelta[];
}

export interface ClassificationEntry {
  rank: number;
  player_id: string;
  team_name: string;
  position: number;
  speed_rank_sum: number;
}

export interface GameState {
  game: Game | null;
  players: Player[];
  player: Player | null;
  answers: Answer[];
}

// ============================================
// Helper: erros do Supabase
// ============================================

/**
 * O Supabase retorna erros Postgres como objetos/strings. Mapeamos o código
 * para o formato que o GameStore.ts já espera (error.code).
 */
function toApiError(error: unknown): Error & { code?: string } {
  if (!error) {
    return new Error('Erro desconhecido');
  }

  const message: string =
    typeof error === 'string'
      ? error
      : typeof error === 'object' && error !== null &&
        ('message' in error || 'details' in error)
        ? String(('message' in error ? error.message : error.details) || 'Erro desconhecido')
        : 'Erro desconhecido';

  const err = new Error(message) as Error & { code?: string };

  // O Postgres devolve código 23505 (unique) / P0001 (raise) como texto
  // dentro da mensagem. O Supabase também pode expor 'code' diretamente.
  if (message.includes('23505') || message.includes('duplicate key')) {
    err.code = '23505';
  } else if (message.includes('P0001')) {
    err.code = 'P0001';
  } else if (typeof error === 'object' && error !== null && 'code' in error) {
    err.code = String(error.code);
  }

  return err;
}

/**
 * Executa uma RPC do Supabase e devolve o `data`. Lança erro tipado
 * no mesmo formato que o backend Express devolvia.
 */
async function rpc<T>(fn: string, params?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, params ?? {});
  if (error) throw toApiError(error);
  return data as T;
}

// ============================================
// API pública (interface IDÊNTICA à versão anterior)
// ============================================

export const database = {
  subscribeToGameChanges,

  // ---------- Games ----------

  async createGame(gameData: {
    game_code: string;
    admin_id: string;
    admin_session_token: string;
    question_order?: number[] | null;
    phase: string;
    current_question_index: number;
    question_revealed: boolean;
  }): Promise<Game> {
    return rpc<Game>('rpc_create_game', {
      p_game_code: gameData.game_code,
      p_admin_id: gameData.admin_id,
      p_admin_session_token: gameData.admin_session_token,
      p_question_order: gameData.question_order ?? null,
    });
  },

  async listQuestionIds(): Promise<number[]> {
    const data = await rpc<number[] | null>('rpc_list_question_ids', {});
    return data ?? [];
  },

  async getGameByCode(code: string): Promise<Game | null> {
    try {
      return await rpc<Game | null>('rpc_get_game_by_code', {
        p_game_code: code,
      });
    } catch {
      return null;
    }
  },

  async getGameById(id: string): Promise<Game | null> {
    try {
      return await rpc<Game | null>('rpc_get_game_by_id', { p_game_id: id });
    } catch {
      return null;
    }
  },

  async updateGame(id: string, adminToken: string, updates: Partial<Game>): Promise<Game> {
    const data = await rpc<Game | null>('rpc_update_game', {
      p_game_id: id,
      p_admin_session_token: adminToken,
      p_phase: updates.phase ?? null,
      p_current_question_index: updates.current_question_index ?? null,
      p_question_revealed:
        updates.question_revealed === undefined ? null : updates.question_revealed,
    });

    if (!data) {
      throw toApiError({ message: 'Game not found' });
    }
    return data;
  },

  // ---------- Players ----------

  async createPlayer(playerData: {
    game_id: string;
    team_name: string;
    f1_team: string;
    position: number;
    is_connected: boolean;
    last_seen: string;
    player_session_token: string;
  }): Promise<Player> {
    return rpc<Player>('rpc_create_player', {
      p_game_id: playerData.game_id,
      p_team_name: playerData.team_name,
      p_f1_team: playerData.f1_team,
      p_player_session_token: playerData.player_session_token,
    });
  },

  async getPlayerById(id: string): Promise<Player | null> {
    try {
      return await rpc<Player | null>('rpc_get_player_by_id', {
        p_player_id: id,
      });
    } catch {
      return null;
    }
  },

  async getPlayerByIdAndGame(id: string, gameId: string): Promise<Player | null> {
    try {
      return await rpc<Player | null>('rpc_get_player_by_id_and_game', {
        p_player_id: id,
        p_game_id: gameId,
      });
    } catch {
      return null;
    }
  },

  async getPlayersByGame(gameId: string): Promise<Player[]> {
    const data = await rpc<Player[] | null>('rpc_get_players_by_game', {
      p_game_id: gameId,
    });
    return data ?? [];
  },

  async updatePlayer(id: string, updates: Partial<Player>): Promise<Player> {
    const data = await rpc<Player | null>('rpc_update_player', {
      p_player_id: id,
      p_position: updates.position ?? null,
      p_is_connected: updates.is_connected ?? null,
      p_last_seen: updates.last_seen ?? null,
    });

    if (!data) {
      throw toApiError({ message: 'Player not found' });
    }
    return data;
  },

  // ---------- Answers ----------

  async createAnswer(answerData: {
    game_id: string;
    player_id: string;
    question_index: number;
    selected_option: number;
  }): Promise<Answer> {
    return rpc<Answer>('rpc_create_answer', {
      p_game_id: answerData.game_id,
      p_player_id: answerData.player_id,
      p_question_index: answerData.question_index,
      p_selected_option: answerData.selected_option,
    });
  },

  async revealQuestion(gameId: string, adminToken: string): Promise<RevealResult> {
    return rpc<RevealResult>('rpc_reveal', {
      p_game_id: gameId,
      p_admin_session_token: adminToken,
    });
  },

  async getDealtQuestions(gameId: string): Promise<DealtQuestion[]> {
    const data = await rpc<DealtQuestion[] | null>('rpc_get_dealt_questions', {
      p_game_id: gameId,
    });
    return data ?? [];
  },

  async getAnswerKey(
    gameId: string,
    adminToken: string,
    questionIndex: number,
  ): Promise<{ option_index: number }> {
    return rpc<{ option_index: number }>('rpc_get_answer_key', {
      p_game_id: gameId,
      p_admin_session_token: adminToken,
      p_question_index: questionIndex,
    });
  },

  async getClassification(gameId: string): Promise<ClassificationEntry[]> {
    const data = await rpc<ClassificationEntry[] | null>('rpc_get_classification', {
      p_game_id: gameId,
    });
    return data ?? [];
  },

  async getAnswersByGame(gameId: string): Promise<Answer[]> {
    const data = await rpc<Answer[] | null>('rpc_get_answers_by_game', {
      p_game_id: gameId,
    });
    return data ?? [];
  },

  async getAnswersByGameAndQuestion(
    gameId: string,
    questionIndex: number
  ): Promise<Answer[]> {
    const data = await rpc<Answer[] | null>('rpc_get_answers_by_game_and_question', {
      p_game_id: gameId,
      p_question_index: questionIndex,
    });
    return data ?? [];
  },

  // ---------- Banco de perguntas (autoria, exige o token do admin) ----------

  async listBankQuestions(gameId: string, adminToken: string): Promise<BankQuestion[]> {
    const data = await rpc<BankQuestion[] | null>('rpc_author_list_questions', {
      p_game_id: gameId,
      p_admin_session_token: adminToken,
    });
    return data ?? [];
  },

  async saveBankQuestion(
    gameId: string,
    adminToken: string,
    questionId: number | null,
    title: string,
    scenario: string,
    options: BankOptionInput[],
  ): Promise<{ id: number; position: number }> {
    return rpc<{ id: number; position: number }>('rpc_author_save_question', {
      p_game_id: gameId,
      p_admin_session_token: adminToken,
      p_question_id: questionId,
      p_title: title,
      p_scenario: scenario,
      p_options: options,
    });
  },

  async deleteBankQuestion(
    gameId: string,
    adminToken: string,
    questionId: number,
  ): Promise<{ deleted: boolean; id: number }> {
    return rpc<{ deleted: boolean; id: number }>('rpc_author_delete_question', {
      p_game_id: gameId,
      p_admin_session_token: adminToken,
      p_question_id: questionId,
    });
  },

  // ---------- Retenção (exige o token do admin) ----------

  async cleanupGames(
    gameId: string,
    adminToken: string,
    keepNewest: number,
    emptyLobbyMinutes: number,
    abandonedHours: number,
  ): Promise<CleanupSummary> {
    return rpc<CleanupSummary>('rpc_cleanup_games', {
      p_game_id: gameId,
      p_admin_session_token: adminToken,
      p_keep_newest: keepNewest,
      p_empty_lobby_minutes: emptyLobbyMinutes,
      p_abandoned_hours: abandonedHours,
    });
  },

  // ---------- RPCs de sessão / presença ----------

  async playerHeartbeat(playerId: string, sessionToken: string): Promise<boolean> {
    return rpc<boolean>('player_heartbeat', {
      p_player_id: playerId,
      p_session_token: sessionToken,
    });
  },

  async adminSessionValid(gameId: string, sessionToken: string): Promise<boolean> {
    return rpc<boolean>('admin_session_valid', {
      p_game_id: gameId,
      p_session_token: sessionToken,
    });
  },

  async removeOfflinePlayer(playerId: string, adminToken: string): Promise<boolean> {
    return rpc<boolean>('remove_offline_player', {
      p_player_id: playerId,
      p_admin_token: adminToken,
    });
  },

  async leaveWaitingPlayer(playerId: string, sessionToken: string): Promise<boolean> {
    return rpc<boolean>('leave_waiting_player', {
      p_player_id: playerId,
      p_session_token: sessionToken,
    });
  },

  // ---------- RPC consolidada (opcional) ----------

  /**
   * Busca game + players + player + answers em UMA só RPC.
   * Reduz 4 requisições por tick de polling para 1.
   * O GameStore ainda não usa (fase 2 da otimização).
   */
  async getGameState(gameId: string, playerId?: string | null): Promise<GameState | null> {
    try {
      return await rpc<GameState | null>('rpc_get_game_state', {
        p_game_id: gameId,
        p_player_id: playerId ?? null,
      });
    } catch {
      return null;
    }
  },
};

export default database;
