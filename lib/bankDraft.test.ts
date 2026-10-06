import { describe, expect, it } from 'vitest';
import { emptyBankDraft, validateBankDraft, type BankQuestionDraft } from './bankDraft';

function validDraft(): BankQuestionDraft {
  return {
    id: null,
    title: 'Um título',
    scenario: 'Um caso para as duplas lerem.',
    options: [
      { option_text: 'Alternativa A', is_correct: true },
      { option_text: 'Alternativa B', is_correct: false },
    ],
  };
}

describe('validateBankDraft', () => {
  it('aceita um rascunho completo com uma correta', () => {
    expect(validateBankDraft(validDraft())).toBeNull();
  });

  it('cobra título e cenário', () => {
    expect(validateBankDraft({ ...validDraft(), title: '   ' })).toMatch(/título/i);
    expect(validateBankDraft({ ...validDraft(), scenario: '' })).toMatch(/caso/i);
  });

  it('exige exatamente uma alternativa correta', () => {
    const none: BankQuestionDraft = {
      ...validDraft(),
      options: [{ option_text: 'A', is_correct: false }, { option_text: 'B', is_correct: false }],
    };
    expect(validateBankDraft(none)).toMatch(/é a correta/);
    const two: BankQuestionDraft = {
      ...validDraft(),
      options: [{ option_text: 'A', is_correct: true }, { option_text: 'B', is_correct: true }],
    };
    expect(validateBankDraft(two)).toMatch(/apenas uma/);
  });

  it('recusa menos de duas alternativas e alternativa sem texto', () => {
    expect(validateBankDraft({ ...validDraft(), options: [{ option_text: 'A', is_correct: true }] })).toMatch(/duas/);
    expect(validateBankDraft({
      ...validDraft(),
      options: [{ option_text: 'A', is_correct: true }, { option_text: '  ', is_correct: false }],
    })).toMatch(/texto/);
  });

  it('recusa alternativas repetidas', () => {
    expect(validateBankDraft({
      ...validDraft(),
      options: [{ option_text: 'Igual', is_correct: true }, { option_text: 'Igual ', is_correct: false }],
    })).toMatch(/repetidas/);
  });

  it('o rascunho vazio falha, como o do botão Nova pergunta', () => {
    expect(validateBankDraft(emptyBankDraft())).not.toBeNull();
  });
});
