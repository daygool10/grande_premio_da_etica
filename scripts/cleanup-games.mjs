#!/usr/bin/env node
// Dry-run-first cleanup for the games table. Without --apply this only prints a
// plan of what the retention policy would delete. The policy here mirrors
// selectGamesToDelete in lib/retention.ts (the tested source of truth), since
// Node cannot import the .ts module without a type-stripping flag.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const RETENTION_DAYS = 14;
const RETENTION_HOURS_FOR_EMPTY = 24;
const KEEP_NEWEST = 25;
const HOURS_TO_MS = 60 * 60 * 1000;

function selectGamesToDelete(games, now) {
  const keepNewest = new Set(
    games
      .map((game) => ({ id: game.id, updatedAtMs: Date.parse(game.updated_at) }))
      .filter((entry) => !Number.isNaN(entry.updatedAtMs))
      .sort((a, b) => b.updatedAtMs - a.updatedAtMs)
      .slice(0, KEEP_NEWEST)
      .map((entry) => entry.id),
  );
  return games
    .map((game) => {
      const updatedAtMs = Date.parse(game.updated_at);
      if (Number.isNaN(updatedAtMs)) return null;
      const ageHours = (now.getTime() - updatedAtMs) / HOURS_TO_MS;
      const reason = reasonFor(game, ageHours, keepNewest);
      return reason === null ? null : { game, reason, ageHours };
    })
    .filter((decision) => decision !== null)
    .sort((a, b) => {
      const aMs = Date.parse(a.game.updated_at);
      const bMs = Date.parse(b.game.updated_at);
      if (aMs !== bMs) return aMs - bMs;
      return a.game.id < b.game.id ? -1 : a.game.id > b.game.id ? 1 : 0;
    });
}

function reasonFor(game, ageHours, keepNewest) {
  if (game.playerCount === 0 && ageHours > RETENTION_HOURS_FOR_EMPTY) {
    return 'empty-lobby';
  }
  if (ageHours > RETENTION_DAYS * 24 && !keepNewest.has(game.id)) {
    return 'stale';
  }
  return null;
}

const HELP = `Usage: node scripts/cleanup-games.mjs [--apply] [--help]

Dry-run cleanup for the games table. Without --apply a plan is printed and
nothing is deleted.

Options:
  --apply   Delete the selected games: answers, then players, then the game
            row, per game. Requires SUPABASE_SERVICE_ROLE_KEY in the
            environment; the anon key can only SELECT, so it cannot delete.
  --help    Show this help and exit.

Credentials:
  SUPABASE_URL and SUPABASE_ANON_KEY are read from the environment. When either
  is missing, the values hardcoded in lib/supabase.ts are used, so a dry run
  works with no setup at all.

Policy (see docs/retention.md):
  - A game older than 14 days is deleted unless it is among the 25 most
    recently updated games.
  - A game with zero players is deleted once it is older than 24 hours,
    regardless of the newest-25 rule.`;

function parseArgs(argv) {
  return { apply: argv.includes('--apply'), help: argv.includes('--help') };
}

function credentials() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    return { supabaseURL: process.env.SUPABASE_URL, supabaseAnonKey: process.env.SUPABASE_ANON_KEY };
  }
  const source = readFileSync(new URL('../lib/supabase.ts', import.meta.url), 'utf8');
  const supabaseURL = source.match(/supabaseUrl = '([^']+)'/)?.[1];
  const supabaseAnonKey = source.match(/supabaseAnonKey = '([^']+)'/)?.[1];
  if (!supabaseURL || !supabaseAnonKey) {
    throw new Error('no credentials in the environment and lib/supabase.ts is unreadable');
  }
  return { supabaseURL, supabaseAnonKey };
}

async function fetchCandidates(supabase) {
  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('id, game_code, updated_at')
    .order('updated_at', { ascending: true });
  if (gamesError) throw new Error(`failed to fetch games: ${gamesError.message}`);

  const playerCounts = new Map();
  const { data: players, error: playersError } = await supabase.from('players').select('game_id');
  if (playersError) throw new Error(`failed to fetch players: ${playersError.message}`);
  for (const row of players ?? []) playerCounts.set(row.game_id, (playerCounts.get(row.game_id) ?? 0) + 1);

  const answerCounts = new Map();
  const { data: answers, error: answersError } = await supabase.from('answers').select('game_id');
  if (answersError) throw new Error(`failed to fetch answers: ${answersError.message}`);
  for (const row of answers ?? []) answerCounts.set(row.game_id, (answerCounts.get(row.game_id) ?? 0) + 1);

  return (games ?? []).map((game) => ({
    id: game.id,
    game_code: game.game_code,
    updated_at: game.updated_at,
    playerCount: playerCounts.get(game.id) ?? 0,
    answerCount: answerCounts.get(game.id) ?? 0,
  }));
}

function formatAge(ageHours) {
  return ageHours < 48 ? `${ageHours.toFixed(1)}h` : `${(ageHours / 24).toFixed(1)}d`;
}

function printPlan(decisions) {
  if (decisions.length === 0) {
    console.log('No games match the retention policy.');
    return;
  }
  console.log('Games that match the retention policy:');
  for (const decision of decisions) {
    const { game, reason, ageHours } = decision;
    console.log(
      `  - ${game.game_code}  age=${formatAge(ageHours)}  players=${game.playerCount}  answers=${game.answerCount}  reason=${reason}`,
    );
  }
  const players = decisions.reduce((sum, decision) => sum + decision.game.playerCount, 0);
  const answers = decisions.reduce((sum, decision) => sum + decision.game.answerCount, 0);
  console.log(
    `Summary: ${decisions.length} game(s), ${players} player(s), ${answers} answer(s) would be removed.`,
  );
}

async function applyDeletes(supabase, decisions) {
  for (const decision of decisions) {
    const answersResult = await supabase.from('answers').delete().eq('game_id', decision.game.id).select('id');
    const playersResult = await supabase.from('players').delete().eq('game_id', decision.game.id).select('id');
    const gamesResult = await supabase.from('games').delete().eq('id', decision.game.id).select('id');
    const error = answersResult.error ?? playersResult.error ?? gamesResult.error;
    if (error) throw new Error(`failed to delete ${decision.game.game_code}: ${error.message}`);
    console.log(
      `Deleted ${decision.game.game_code}: ${playersResult.data?.length ?? 0} players, ${answersResult.data?.length ?? 0} answers.`,
    );
  }
  const { count, error } = await supabase.from('games').select('*', { count: 'exact', head: true });
  if (error) throw new Error(`failed to count games: ${error.message}`);
  console.log(`Final game count: ${count}`);
}

async function main() {
  const { apply, help } = parseArgs(process.argv.slice(2));
  if (help) {
    console.log(HELP);
    return;
  }
  if (apply && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('--apply requires SUPABASE_SERVICE_ROLE_KEY in the environment (the anon key can only SELECT); aborting without deleting anything.');
    process.exitCode = 1;
    return;
  }
  const { supabaseURL, supabaseAnonKey } = credentials();
  const key = apply ? process.env.SUPABASE_SERVICE_ROLE_KEY : supabaseAnonKey;
  const supabase = createClient(supabaseURL, key);

  const candidates = await fetchCandidates(supabase);
  const decisions = selectGamesToDelete(candidates, new Date());
  printPlan(decisions);
  if (apply) await applyDeletes(supabase, decisions);
}

await main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});