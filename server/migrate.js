import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
const MIGRATIONS_LOCK_KEY = 72102001;
const dryRun = process.argv.includes('--dry-run');

function readMigrations() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => ({
      name,
      sql: fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8'),
    }));
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATIONS_LOCK_KEY]);

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.name));
    const pending = readMigrations().filter((migration) => !applied.has(migration.name));

    if (pending.length === 0) {
      console.log('No pending migrations to apply.');
      return;
    }

    console.log(dryRun ? 'Migrations that WOULD be applied:' : 'Applying migrations:');
    for (const migration of pending) {
      console.log(`  ${migration.name}`);
      if (dryRun) continue;

      try {
        await client.query('BEGIN');
        await client.query(migration.sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [migration.name]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Migration ${migration.name} failed: ${error.message}`);
        process.exitCode = 1;
        return;
      }
    }

    if (dryRun) {
      console.log('Nothing applied (--dry-run).');
    } else {
      console.log('All pending migrations applied.');
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATIONS_LOCK_KEY]).catch(() => {});
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Migration runner error:', error.message);
  process.exitCode = 1;
  pool.end();
});