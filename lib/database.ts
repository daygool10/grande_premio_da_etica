const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface ApiError extends Error {
  code?: string;
}

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData: { error?: string; code?: string } = await response.json().catch(() => ({}));
    const error = new Error(errorData.error || `HTTP ${response.status}`) as ApiError;
    error.code = errorData.code;
    throw error;
  }

  return response.json();
}

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
  skipped_turn: boolean;
  is_connected: boolean;
  last_seen: string;
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

type CreateAnswerResult =
  | { status: 'saved'; answer: Answer }
  | { status: 'already_answered' };

export const database = {
  async createGame(gameData: {
    game_code: string;
    admin_id: string;
    admin_session_token: string;
    phase: string;
    current_question_index: number;
    question_order: number[];
    question_revealed: boolean;
  }): Promise<Game> {
    return apiFetch<Game>('/games', {
      method: 'POST',
      body: JSON.stringify(gameData),
    });
  },

  async getGameByCode(code: string): Promise<Game | null> {
    try {
      return await apiFetch<Game>(`/games/code/${code}`);
    } catch {
      return null;
    }
  },

  async getGameById(id: string): Promise<Game | null> {
    try {
      return await apiFetch<Game>(`/games/${id}`);
    } catch {
      return null;
    }
  },

  async updateGame(id: string, updates: Partial<Game>): Promise<Game> {
    return apiFetch<Game>(`/games/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async createPlayer(playerData: {
    game_id: string;
    team_name: string;
    f1_team: string;
    position: number;
    skipped_turn: boolean;
    is_connected: boolean;
    last_seen: string;
    player_session_token: string;
  }): Promise<Player> {
    return apiFetch<Player>('/players', {
      method: 'POST',
      body: JSON.stringify(playerData),
    });
  },

  async getPlayerById(id: string): Promise<Player | null> {
    try {
      return await apiFetch<Player>(`/players/${id}`);
    } catch {
      return null;
    }
  },

  async getPlayerByIdAndGame(id: string, gameId: string): Promise<Player | null> {
    try {
      return await apiFetch<Player>(`/players/${id}/game/${gameId}`);
    } catch {
      return null;
    }
  },

  async getPlayersByGame(gameId: string): Promise<Player[]> {
    return apiFetch<Player[]>(`/games/${gameId}/players`);
  },

  async updatePlayer(id: string, updates: Partial<Player>): Promise<Player> {
    return apiFetch<Player>(`/players/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async batchUpdatePlayers(updates: Array<{ id: string; position: number; skipped_turn: boolean }>): Promise<void> {
    await apiFetch('/players/batch-update', {
      method: 'POST',
      body: JSON.stringify({ updates }),
    });
  },

  async createAnswer(answerData: {
    game_id: string;
    player_id: string;
    question_index: number;
    selected_option: number;
    is_correct: boolean;
  }): Promise<CreateAnswerResult> {
    try {
      const answer = await apiFetch<Answer>('/answers', {
        method: 'POST',
        body: JSON.stringify(answerData),
      });
      return { status: 'saved', answer };
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === '23505') return { status: 'already_answered' };
      throw error;
    }
  },

  async getAnswersByGame(gameId: string): Promise<Answer[]> {
    return apiFetch<Answer[]>(`/games/${gameId}/answers`);
  },

  async getAnswersByGameAndQuestion(gameId: string, questionIndex: number): Promise<Answer[]> {
    return apiFetch<Answer[]>(`/games/${gameId}/answers/question/${questionIndex}`);
  },

  async playerHeartbeat(playerId: string, sessionToken: string): Promise<boolean> {
    return apiFetch<boolean>('/rpc/player_heartbeat', {
      method: 'POST',
      body: JSON.stringify({
        p_player_id: playerId,
        p_session_token: sessionToken,
      }),
    });
  },

  async removeOfflinePlayer(playerId: string, adminToken: string): Promise<boolean> {
    return apiFetch<boolean>('/rpc/remove_offline_player', {
      method: 'POST',
      body: JSON.stringify({
        p_player_id: playerId,
        p_admin_token: adminToken,
      }),
    });
  },

  async leaveWaitingPlayer(playerId: string, sessionToken: string): Promise<boolean> {
    return apiFetch<boolean>('/rpc/leave_waiting_player', {
      method: 'POST',
      body: JSON.stringify({
        p_player_id: playerId,
        p_session_token: sessionToken,
      }),
    });
  },
};

export default database;