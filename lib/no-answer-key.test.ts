import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');

describe('client question boundary', () => {
  it('keeps the question bank and answer key on the server', () => {
    const questionsSource = readFileSync(join(root, 'data/questions.tsx'), 'utf8');
    expect(questionsSource).not.toMatch(/(?:export\s+)?(?:const|let|var)\s+\w*(?:questions|questionBank)\s*=/i);
    expect(questionsSource).not.toMatch(/isCorrect/);

    const componentSources = readdirSync(join(root, 'components'))
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .map((file) => readFileSync(join(root, 'components', file), 'utf8'));
    expect(componentSources.join('\n')).not.toMatch(/(?:questions|questionBank)\s*from\s*['"][^'"]*data\//i);
  });
});
