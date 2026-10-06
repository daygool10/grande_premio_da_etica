// ============================================
// Autenticação das rotas de escrita
// Os tokens de sessão vivem em tabelas privadas
// (private_game_admin_sessions e
// private_player_sessions): disparadas por triggers
// AFTER INSERT, elas guardam o token e NULL a coluna
// pública correspondente. O único caminho para
// validar quem chama é comparar o token enviado no
// header com essas tabelas — nunca com as colunas
// públicas de games/players, que foram zeradas.
// ============================================

export const SESSION_HEADER = 'x-session-token';

// Lê o token do header como string não vazia; devolve
// null quando ausente, vazio ou em formato inesperado.
export function sessionTokenFrom(request) {
  const value = request.headers[SESSION_HEADER];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

// É o admin da partida? Compara o token com a linha de
// private_game_admin_sessions daquele game.
export async function isGameAdmin(pool, gameId, token) {
  if (!gameId || !token) return false;
  const result = await pool.query(
    'SELECT 1 FROM private_game_admin_sessions WHERE game_id = $1 AND session_token = $2',
    [gameId, token],
  );
  return result.rows.length > 0;
}

// É o dono do jogador? Compara o token com a linha de
// private_player_sessions daquele player.
export async function isPlayerOwner(pool, playerId, token) {
  if (!playerId || !token) return false;
  const result = await pool.query(
    'SELECT 1 FROM private_player_sessions WHERE player_id = $1 AND session_token = $2',
    [playerId, token],
  );
  return result.rows.length > 0;
}

// É o admin da partida do jogador? Resolve a partida do
// player e compara o token contra o admin daquele game.
export async function isGameAdminOfPlayer(pool, playerId, token) {
  if (!playerId || !token) return false;
  const playerResult = await pool.query(
    'SELECT game_id FROM players WHERE id = $1',
    [playerId],
  );
  if (playerResult.rows.length === 0) return false;
  return isGameAdmin(pool, playerResult.rows[0].game_id, token);
}

// Autoriza um lote de jogadores: todos devem pertencer
// a UMA ÚNICA partida e o token deve ser o admin dela.
// Devolve o game_id quando autorizado e null caso
// contrário — um token que não casa nada retorna null,
// nunca lança.
export async function isGameAdminOfPlayers(pool, playerIds, token) {
  if (!Array.isArray(playerIds) || playerIds.length === 0 || !token) return null;

  const gamesResult = await pool.query(
    'SELECT DISTINCT game_id FROM players WHERE id = ANY($1::uuid[])',
    [playerIds],
  );

  if (gamesResult.rows.length !== 1) return null;

  const gameId = gamesResult.rows[0].game_id;
  const adminResult = await pool.query(
    'SELECT 1 FROM private_game_admin_sessions WHERE game_id = $1 AND session_token = $2',
    [gameId, token],
  );

  return adminResult.rows.length > 0 ? gameId : null;
}