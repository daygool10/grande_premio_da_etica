import express from 'express';
import cors from 'cors';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '1234',
  database: process.env.PGDATABASE || 'etica_f1',
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
});

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// Helpers
// ============================================

function sanitizeGame(game) {
  if (!game) return null;
  const { admin_session_token, ...safe } = game;
  return safe;
}

function sanitizePlayer(player) {
  if (!player) return null;
  const { player_session_token, ...safe } = player;
  return safe;
}

// ============================================
// Games
// ============================================

// Criar partida
app.post('/games', async (req, res) => {
  try {
    const { game_code, admin_id, admin_session_token, phase, current_question_index, question_order, question_revealed } = req.body;

    const result = await pool.query(
      `INSERT INTO games (game_code, admin_id, admin_session_token, phase, current_question_index, question_order, question_revealed)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [game_code, admin_id, admin_session_token, phase, current_question_index, question_order, question_revealed]
    );

    res.json(sanitizeGame(result.rows[0]));
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar partida por código
app.get('/games/code/:code', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM games WHERE game_code = $1',
      [req.params.code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json(sanitizeGame(result.rows[0]));
  } catch (error) {
    console.error('Error fetching game by code:', error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar partida por ID
app.get('/games/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM games WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json(sanitizeGame(result.rows[0]));
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ error: error.message });
  }
});

// Atualizar partida
app.patch('/games/:id', async (req, res) => {
  try {
    const { phase, current_question_index, question_revealed } = req.body;
    const gameId = req.params.id;

    // Construir query dinâmica baseada nos campos fornecidos
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (phase !== undefined) {
      updates.push(`phase = $${paramIndex++}`);
      values.push(phase);
    }
    if (current_question_index !== undefined) {
      updates.push(`current_question_index = $${paramIndex++}`);
      values.push(current_question_index);
    }
    if (question_revealed !== undefined) {
      updates.push(`question_revealed = $${paramIndex++}`);
      values.push(question_revealed);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(gameId);

    const result = await pool.query(
      `UPDATE games SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json(sanitizeGame(result.rows[0]));
  } catch (error) {
    console.error('Error updating game:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Players
// ============================================

// Criar jogador
app.post('/players', async (req, res) => {
  try {
    const { game_id, team_name, f1_team, position, skipped_turn, is_connected, last_seen, player_session_token } = req.body;

    const result = await pool.query(
      `INSERT INTO players (game_id, team_name, f1_team, position, skipped_turn, is_connected, last_seen, player_session_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [game_id, team_name, f1_team, position, skipped_turn, is_connected, last_seen, player_session_token]
    );

    res.json(sanitizePlayer(result.rows[0]));
  } catch (error) {
    console.error('Error creating player:', error);
    if (error.code === 'P0001') {
      return res.status(400).json({ error: error.message, code: 'P0001' });
    }
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Team already taken', code: '23505' });
    }
    res.status(500).json({ error: error.message, code: error.code });
  }
});

// Buscar jogador por ID
app.get('/players/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM players WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json(sanitizePlayer(result.rows[0]));
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar jogador por ID e game_id
app.get('/players/:id/game/:gameId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM players WHERE id = $1 AND game_id = $2',
      [req.params.id, req.params.gameId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json(sanitizePlayer(result.rows[0]));
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar jogadores de uma partida
app.get('/games/:id/players', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM players WHERE game_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );

    res.json(result.rows.map(sanitizePlayer));
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: error.message });
  }
});

// Atualizar jogador
app.patch('/players/:id', async (req, res) => {
  try {
    const { position, skipped_turn, is_connected, last_seen } = req.body;
    const playerId = req.params.id;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (position !== undefined) {
      updates.push(`position = $${paramIndex++}`);
      values.push(position);
    }
    if (skipped_turn !== undefined) {
      updates.push(`skipped_turn = $${paramIndex++}`);
      values.push(skipped_turn);
    }
    if (is_connected !== undefined) {
      updates.push(`is_connected = $${paramIndex++}`);
      values.push(is_connected);
    }
    if (last_seen !== undefined) {
      updates.push(`last_seen = $${paramIndex++}`);
      values.push(last_seen);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(playerId);

    const result = await pool.query(
      `UPDATE players SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json(sanitizePlayer(result.rows[0]));
  } catch (error) {
    console.error('Error updating player:', error);
    res.status(500).json({ error: error.message });
  }
});

// Atualizar múltiplos jogadores (batch)
app.post('/players/batch-update', async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Invalid updates array' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const update of updates) {
        await client.query(
          'UPDATE players SET position = $1, skipped_turn = $2 WHERE id = $3',
          [update.position, update.skipped_turn, update.id]
        );
      }

      await client.query('COMMIT');
      res.json({ success: true });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error batch updating players:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Answers
// ============================================

// Criar resposta
app.post('/answers', async (req, res) => {
  try {
    const { game_id, player_id, question_index, selected_option, is_correct } = req.body;

    const result = await pool.query(
      `INSERT INTO answers (game_id, player_id, question_index, selected_option, is_correct)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [game_id, player_id, question_index, selected_option, is_correct]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating answer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar respostas de uma partida
app.get('/games/:id/answers', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM answers WHERE game_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching answers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar respostas de uma partida com filtro de questão
app.get('/games/:id/answers/question/:questionIndex', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM answers WHERE game_id = $1 AND question_index = $2',
      [req.params.id, req.params.questionIndex]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching answers:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// RPC - Funções de presença
// ============================================

// Heartbeat do jogador
app.post('/rpc/player_heartbeat', async (req, res) => {
  try {
    const { p_player_id, p_session_token } = req.body;

    const result = await pool.query(
      'SELECT player_heartbeat($1, $2) as result',
      [p_player_id, p_session_token]
    );

    res.json(result.rows[0].result);
  } catch (error) {
    console.error('Error in player_heartbeat:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remover jogador offline
app.post('/rpc/remove_offline_player', async (req, res) => {
  try {
    const { p_player_id, p_admin_token } = req.body;

    const result = await pool.query(
      'SELECT remove_offline_player($1, $2) as result',
      [p_player_id, p_admin_token]
    );

    res.json(result.rows[0].result);
  } catch (error) {
    console.error('Error in remove_offline_player:', error);
    res.status(500).json({ error: error.message });
  }
});

// Jogador sai da sala de espera
app.post('/rpc/leave_waiting_player', async (req, res) => {
  try {
    const { p_player_id, p_session_token } = req.body;

    const result = await pool.query(
      'SELECT leave_waiting_player($1, $2) as result',
      [p_player_id, p_session_token]
    );

    res.json(result.rows[0].result);
  } catch (error) {
    console.error('Error in leave_waiting_player:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Health check
// ============================================

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// ============================================
// Start server
// ============================================

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
