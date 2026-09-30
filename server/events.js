import pg from 'pg';

const { Client } = pg;

const CHANNEL = 'game_events';
const KEEPALIVE_MS = 20000;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

const clients = new Set();

let client = null;
let connecting = false;
let reconnectDelay = RECONNECT_BASE_MS;
let reconnectTimer = null;

// ============================================
// Configuração de conexão (mesmas envs do index.js)
// ============================================

function buildClientConfig() {
  return {
    connectionString: process.env.DATABASE_URL,
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '1234',
    database: process.env.PGDATABASE || 'etica_f1',
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
  };
}

// ============================================
// Clientes SSE
// ============================================

function removeClient(streamClient) {
  clients.delete(streamClient);
}

// Escreve um frame no cliente; um cliente quebrado nunca
// derruba os demais nem o processo.
function writeFrame(streamClient, chunk) {
  const res = streamClient.res;
  try {
    if (res.writableEnded || res.destroyed || !res.socket) {
      removeClient(streamClient);
      return;
    }
    res.write(chunk);
  } catch (error) {
    removeClient(streamClient);
    res.destroy();
  }
}

function broadcast(payload) {
  const frame = `data: ${JSON.stringify(payload)}\n\n`;
  for (const streamClient of clients) {
    if (streamClient.game && streamClient.game !== payload.game_id) continue;
    writeFrame(streamClient, frame);
  }
}

function sendKeepAlive() {
  for (const streamClient of clients) {
    writeFrame(streamClient, ': keep-alive\n\n');
  }
}

// ============================================
// Conexão LISTEN dedicada (client, não pool)
// ============================================

function listen() {
  listenCore().catch(() => {});
}

async function listenCore() {
  if (connecting) return;
  connecting = true;

  const nextClient = new Client(buildClientConfig());
  client = nextClient;

  nextClient.on('notification', (message) => {
    try {
      broadcast(JSON.parse(message.payload));
    } catch (error) {
      console.error('[events] invalid notification payload:', error.message);
    }
  });
  nextClient.on('error', (error) => {
    console.error('[events] LISTEN connection error:', error.message);
  });
  nextClient.on('end', () => {
    if (client !== nextClient) return;
    client = null;
    connecting = false;
    const delay = reconnectDelay;
    reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS);
    console.error(`[events] LISTEN connection closed; reconnecting in ${delay}ms`);
    reconnectTimer = setTimeout(listen, delay);
  });

  try {
    await nextClient.connect();
    await nextClient.query(`LISTEN ${CHANNEL}`);
    if (client !== nextClient) {
      await nextClient.end().catch(() => {});
      return;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    reconnectDelay = RECONNECT_BASE_MS;
    console.log(`[events] LISTEN established on channel "${CHANNEL}"`);
  } catch (error) {
    if (client !== nextClient) return;
    client = null;
    connecting = false;
    const delay = reconnectDelay;
    reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS);
    console.error(`[events] LISTEN connect failed: ${error.message}; reconnecting in ${delay}ms`);
    reconnectTimer = setTimeout(listen, delay);
  }
}

// ============================================
// Registro da rota
// ============================================

// Registra GET /events (SSE) no app Express e inicia a
// escuta LISTEN. Aceita ?game=<uuid> para filtrar por partida.
export function registerEvents(app) {
  listen();
  setInterval(sendKeepAlive, KEEPALIVE_MS);

  app.get('/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.write(': connected\n\n');
    res.write('retry: 3000\n\n');

    const streamClient = { res, game: req.query.game ? String(req.query.game) : null };
    clients.add(streamClient);

    req.on('close', () => removeClient(streamClient));
    res.on('error', (error) => {
      console.error('[events] client stream error:', error.message);
      removeClient(streamClient);
      res.destroy();
    });
  });
}