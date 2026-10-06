import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');
const sourceRoots = ['store', 'components', 'lib', 'data'];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith('.test.ts') ? [] : [path];
  });
}

describe('client scoring boundary', () => {
  it('keeps scoring out of the browser', () => {
    // This guard stops the SQL scoring rules from creeping back into the browser.
    const forbidden = [
      /(?:4|3|2|1)\s*:\s*(?:[34]|[0-9]+)(?:\s*,\s*(?:4|3|2|1)\s*:)/,
      /rpc_batch_update_players/,
      // A declaração de um campo is_correct num tipo é legítima; o que nunca pode voltar é o
      // navegador ENVIAR correção ou tempo ao servidor (os parâmetros das RPCs).
      /\bp_is_correct\b|\bp_response_time_ms\b/,
      /\.isCorrect\b/,
    ];
    const violations = sourceRoots.flatMap((directory) => sourceFiles(join(root, directory))).flatMap((file) => {
      const text = readFileSync(file, 'utf8');
      return forbidden.filter((pattern) => pattern.test(text)).map((pattern) => `${file}: ${pattern}`);
    });
    expect(violations).toEqual([]);
  });
});
