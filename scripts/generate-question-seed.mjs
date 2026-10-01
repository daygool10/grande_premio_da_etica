#!/usr/bin/env node
//
// Gerador em tempo de desenvolvimento (repo root, fora do bundle do cliente).
// Lê data/questions.tsx através do esbuild — o único jeito de carregar um
// módulo .tsx pelo Node — e emite o seed SQL em
// server/migrations/0005_questions_seed.sql.
//
// Determinístico: mesma entrada gera o mesmo arquivo, byte a byte, para que a
// seed seja reprodutível e fácil de revisar em diff. Nada aqui toca o server
// em runtime nem o banco; ele só escreve o arquivo de migração.
//
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'data', 'questions.tsx');
const OUTPUT = join(ROOT, 'server', 'migrations', '0005_questions_seed.sql');
const PENALTY_TYPES = new Set(['skip', 'back1', 'back2', 'start']);

function fail(message) {
  console.error(`generate-question-seed.mjs: ${message}`);
  process.exit(1);
}

async function loadQuestions() {
  const result = await build({
    entryPoints: [SOURCE],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    logLevel: 'silent',
  });
  if (result.outputFiles.length !== 1) fail('esbuild did not produce a single output file');

  const tmpDir = mkdtempSync(join(tmpdir(), 'qseed-'));
  const tmpFile = join(tmpDir, 'questions.mjs');
  writeFileSync(tmpFile, result.outputFiles[0].text);
  try {
    const loaded = await import(pathToFileURL(tmpFile).href);
    if (!Array.isArray(loaded.questions)) fail(`no "questions" array exported by ${SOURCE}`);
    return loaded.questions;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

function validate(questions) {
  if (questions.length === 0) fail(`${SOURCE} exports an empty questions array`);
  const ids = new Set();
  for (const question of questions) {
    if (!Number.isInteger(question.id)) fail('a question has a non-integer id');
    if (ids.has(question.id)) fail(`duplicate question id ${question.id}`);
    ids.add(question.id);
    if (typeof question.title !== 'string' || question.title.length === 0) {
      fail(`question ${question.id}: title missing`);
    }
    if (typeof question.scenario !== 'string' || question.scenario.length === 0) {
      fail(`question ${question.id}: scenario missing`);
    }
    if (!Array.isArray(question.options) || question.options.length === 0) {
      fail(`question ${question.id}: no options`);
    }
    question.options.forEach((option, index) => {
      if (typeof option.text !== 'string') fail(`question ${question.id} option ${index}: text missing`);
      if (typeof option.isCorrect !== 'boolean') {
        fail(`question ${question.id} option ${index}: isCorrect must be boolean`);
      }
      if (!Number.isInteger(option.advance)) fail(`question ${question.id} option ${index}: advance must be integer`);
      const hasPenalty = option.penalty !== null && option.penalty !== undefined;
      const hasType = option.penaltyType !== null && option.penaltyType !== undefined;
      if (hasPenalty !== hasType) {
        fail(`question ${question.id} option ${index}: penalty and penaltyType must both be null or both set`);
      }
      if (hasPenalty && typeof option.penalty !== 'string') {
        fail(`question ${question.id} option ${index}: penalty must be a string`);
      }
      if (hasType && !PENALTY_TYPES.has(option.penaltyType)) {
        fail(`question ${question.id} option ${index}: unknown penaltyType "${option.penaltyType}"`);
      }
    });
  }
  return ids;
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function buildSql(questions, optionCount) {
  const questionRows = questions.map(
    (question, index) =>
      `  (${question.id}, ${sqlString(question.title)}, ${sqlString(question.scenario)}, ${index + 1}, now())`,
  );

  const optionRows = [];
  for (const question of questions) {
    question.options.forEach((option, index) => {
      const penalty = option.penalty === null ? 'NULL' : sqlString(option.penalty);
      const penaltyType = option.penaltyType === null ? 'NULL' : sqlString(option.penaltyType);
      optionRows.push(
        `  (${question.id}, ${index}, ${sqlString(option.text)}, ` +
          `${option.isCorrect}, ${option.advance}, ${penalty}, ${penaltyType})`,
      );
    });
  }

  return `-- ============================================
-- Migração 0005: seed das perguntas e opções
-- ARQUIVO GERADO — não edite à mão.
--   fonte:   data/questions.tsx
--   gerado:  scripts/generate-question-seed.mjs
-- ${questions.length} perguntas, ${optionCount} opções.
-- Replay-safe (idempotente) via ON CONFLICT DO UPDATE:
--   questions          -> ON CONFLICT (id)
--   question_options   -> ON CONFLICT (question_id, option_index)
-- ============================================

INSERT INTO public.questions (id, title, scenario, position, created_at) VALUES
${questionRows.join(',\n')}
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  scenario = EXCLUDED.scenario,
  position = EXCLUDED.position;

INSERT INTO public.question_options (question_id, option_index, option_text, is_correct, advance, penalty, penalty_type) VALUES
${optionRows.join(',\n')}
ON CONFLICT (question_id, option_index) DO UPDATE SET
  option_text = EXCLUDED.option_text,
  is_correct = EXCLUDED.is_correct,
  advance = EXCLUDED.advance,
  penalty = EXCLUDED.penalty,
  penalty_type = EXCLUDED.penalty_type;
`;
}

const questions = await loadQuestions();
const ids = validate(questions);
const optionCount = questions.reduce((total, question) => total + question.options.length, 0);
writeFileSync(OUTPUT, buildSql(questions, optionCount));
console.log(`Generated ${OUTPUT}`);
console.log(`  ${questions.length} questions, ${optionCount} options, ids ${Math.min(...ids)}..${Math.max(...ids)} (unique: ${ids.size})`);