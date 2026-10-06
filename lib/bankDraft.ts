export interface BankOptionDraft {
  option_text: string;
  is_correct: boolean;
}

export interface BankQuestionDraft {
  id: number | null;
  title: string;
  scenario: string;
  options: BankOptionDraft[];
}

export const MIN_BANK_OPTIONS = 2;
export const MAX_BANK_OPTIONS = 6;

export function emptyBankDraft(): BankQuestionDraft {
  return {
    id: null,
    title: '',
    scenario: '',
    options: [
      { option_text: '', is_correct: true },
      { option_text: '', is_correct: false },
    ],
  };
}

/**
 * Espelha as validacoes do servidor (rpc_author_save_question) para o host ver o problema antes do
 * round-trip. Devolve a mensagem de erro, ou null quando o rascunho esta pronto para enviar.
 */
export function validateBankDraft(draft: BankQuestionDraft): string | null {
  if (draft.title.trim() === '') return 'Dê um título à pergunta.';
  if (draft.scenario.trim() === '') return 'Escreva o caso, o texto que as duplas vão ler.';
  if (draft.options.length < MIN_BANK_OPTIONS) return 'Uma pergunta precisa de pelo menos duas alternativas.';
  if (draft.options.length > MAX_BANK_OPTIONS) return 'Uma pergunta aceita no máximo seis alternativas.';

  const blanks = draft.options.filter((option) => option.option_text.trim() === '').length;
  if (blanks > 0) return 'Toda alternativa precisa de texto.';

  const correct = draft.options.filter((option) => option.is_correct).length;
  if (correct === 0) return 'Marque qual alternativa é a correta.';
  if (correct > 1) return 'Marque apenas uma alternativa correta.';

  const repeated = draft.options.some((option, index) =>
    draft.options.findIndex((other) => other.option_text.trim() === option.option_text.trim()) !== index);
  if (repeated) return 'Há alternativas repetidas.';

  return null;
}
