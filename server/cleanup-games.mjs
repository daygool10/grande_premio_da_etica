#!/usr/bin/env node
// Limpeza dry-run-first da tabela games. Sem --apply, imprime apenas o plano do
// que a politica de retencao (lib/retention.ts) apagaria, e nao apaga nada.
// A politica NAO e duplicada aqui: as regras, os limiares e a ordenacao vêm de
// selectGamesToDelete, importado de ../lib/retention.ts e carregado com o type
// stripping nativo do Node 22 (node --experimental-strip-types).
//
// O schema declara ON DELETE CASCADE de players e answers — e das tabelas
// privadas de sessao — para games. Por isso apagar a linha do game remove os
// filhos automaticamente; nao ha delete manual de filhos como o runner antigo
// do Supabase precisava fazer.
import pg from 'pg';
import {
  KEEP_NEWEST,
  RETENTION_DAYS,
  RETENTION_HOURS_FOR_EMPTY,
  selectGamesToDelete,
} from '../lib/retention.ts';

const { Pool } = pg;

const HELP = `Uso: node --experimental-strip-types cleanup-games.mjs [--apply] [--help]

Limpeza dry-run-first da tabela games. Sem --apply, um plano e impresso e nada
e apagado; com --apply o script primeiro imprime o que vai remover e entao
executa os DELETEs numa transacao unica.

Opcoes:
  --apply   Apaga os games selecionados. Os filhos (players, answers, sessoes
            privadas) saem por ON DELETE CASCADE do proprio banco.
  --help    Mostra esta ajuda e sai.

Conexao:
  DATABASE_URL e obrigatoria; sem ela o script recusa rodar e sai com codigo
  de erro, sem apagar nada.

Politica (lib/retention.ts):
  - Um game com updated_at mais antigo que ${RETENTION_DAYS} dias e apagado, exceto
    se estiver entre os ${KEEP_NEWEST} games mais recentes.
  - Um game com zero players e apagado quando mais antigo que ${RETENTION_HOURS_FOR_EMPTY}
    horas, mesmo dentro dos ${KEEP_NEWEST} mais recentes.

Schema:
  A coluna games.updated_at existe porque a migracao 0003_games_updated_at.sql
  a cria (timestamptz NOT NULL DEFAULT now()); o init.sql so tinha created_at.
  A mesma migracao instala o trigger games_stamp_updated_at, que carimba
  updated_at = now() em todo UPDATE de games -- inclusive num UPDATE que nao
  muda nenhum valor (tocado e tocado). Sem essa coluna o script recusa rodar.`;

function parseArgs(argv) {
  return { apply: argv.includes('--apply'), help: argv.includes('--help') };
}

function connectionString() {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error('DATABASE_URL e obrigatoria (a coluna games.updated_at deve existir); nada foi apagado.');
  }
  return value;
}

function createPool(connectionStringValue) {
  return new Pool({
    connectionString: connectionStringValue,
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
  });
}

async function fetchCandidates(client) {
  const { rows } = await client.query(`
    SELECT
      g.id,
      g.game_code,
      g.updated_at,
      (SELECT count(*)::int FROM public.players p WHERE p.game_id = g.id) AS "playerCount",
      (SELECT count(*)::int FROM public.answers a WHERE a.game_id = g.id) AS "answerCount"
    FROM public.games g
    ORDER BY g.updated_at ASC
  `);
  return rows;
}

function formatAge(ageHours) {
  return ageHours < 48 ? `${ageHours.toFixed(1)}h` : `${(ageHours / 24).toFixed(1)}d`;
}

function printPlan(decisions) {
  if (decisions.length === 0) {
    console.log('Nenhum game corresponde a politica de retencao.');
    return;
  }
  console.log('Games que a politica apagaria:');
  for (const { game, reason, ageHours } of decisions) {
    console.log(
      `  - ${game.game_code}  idade=${formatAge(ageHours)}  players=${game.playerCount}  respostas=${game.answerCount}  motivo=${reason}`,
    );
  }
  const players = decisions.reduce((sum, decision) => sum + decision.game.playerCount, 0);
  const answers = decisions.reduce((sum, decision) => sum + decision.game.answerCount, 0);
  console.log(
    `Resumo: ${decisions.length} game(s) com ${players} player(s) e ${answers} resposta(s) seriam removidos (filhos por ON DELETE CASCADE).`,
  );
}

async function deleteSelected(client, decisions) {
  const ids = decisions.map((decision) => decision.game.id);
  const { rowCount } = await client.query('DELETE FROM public.games WHERE id = ANY($1::uuid[])', [ids]);
  return rowCount;
}

async function run() {
  const { apply, help } = parseArgs(process.argv.slice(2));
  if (help) {
    console.log(HELP);
    return;
  }

  const pool = createPool(connectionString());
  const client = await pool.connect();
  try {
    const candidates = await fetchCandidates(client);
    const decisions = selectGamesToDelete(candidates, new Date());
    printPlan(decisions);

    if (!apply) {
      console.log('Dry run: nada foi apagado. Rode com --apply para apagar.');
      return;
    }
    if (decisions.length === 0) {
      console.log('--apply: nada a apagar.');
      return;
    }

    await client.query('BEGIN');
    try {
      const deleted = await deleteSelected(client, decisions);
      await client.query('COMMIT');
      console.log(`Apagados ${deleted} game(s) em uma transacao.`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error(`Erro (nada foi apagado): ${error.message}`);
  process.exitCode = 1;
});