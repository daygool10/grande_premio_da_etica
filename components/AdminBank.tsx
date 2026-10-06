import { useEffect, useState } from 'react';
import { useGameStore } from '../store/GameStore';
import {
  MAX_BANK_OPTIONS,
  MIN_BANK_OPTIONS,
  emptyBankDraft,
  validateBankDraft,
  type BankQuestionDraft,
} from '../lib/bankDraft';
import type { BankQuestion } from '../lib/database';

const LETTERS = 'ABCDEF';

export function AdminBank() {
  const { bankQuestions, bankError, loadBankQuestions, saveBankQuestion, deleteBankQuestion } = useGameStore();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<BankQuestionDraft | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) void loadBankQuestions();
  }, [isOpen, loadBankQuestions]);

  const startEdit = (question: BankQuestion) => {
    setFeedback('');
    setDraft({
      id: question.id,
      title: question.title,
      scenario: question.scenario,
      options: question.options.map((option) => ({
        option_text: option.option_text,
        is_correct: option.is_correct,
      })),
    });
  };

  const setOptionText = (index: number, value: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      options: draft.options.map((option, position) =>
        position === index ? { ...option, option_text: value } : option),
    });
  };

  const markCorrect = (index: number) => {
    if (!draft) return;
    setDraft({
      ...draft,
      options: draft.options.map((option, position) => ({ ...option, is_correct: position === index })),
    });
  };

  const handleSubmit = async () => {
    if (!draft || isSaving) return;
    const problem = validateBankDraft(draft);
    if (problem) {
      setFeedback(problem);
      return;
    }
    setIsSaving(true);
    try {
      const saved = await saveBankQuestion(draft.id, draft.title.trim(), draft.scenario.trim(), draft.options);
      if (saved) {
        setDraft(null);
        setFeedback(draft.id === null ? 'Pergunta criada.' : 'Pergunta atualizada.');
      } else {
        setFeedback('Não foi possível salvar. Vira e mexe o problema é a conexão.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (question: BankQuestion) => {
    setFeedback('');
    const removed = await deleteBankQuestion(question.id);
    if (removed) setFeedback(`Pergunta ${question.id} apagada.`);
  };

  return (
    <section className="rounded-xl border border-gray-700 bg-gray-800/70 p-4">
      <div className="flex items-center gap-3">
        <h3 className="text-base font-bold uppercase tracking-wider text-gray-300">📚 Banco de perguntas</h3>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="ml-auto rounded-lg border border-gray-600 px-3 py-2 text-sm font-semibold text-gray-200 hover:border-gray-400"
        >
          {isOpen ? 'Fechar banco' : `Abrir banco (${bankQuestions.length})`}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 space-y-4">
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {bankQuestions.map((question) => (
              <div key={question.id} className="flex items-start gap-3 rounded-lg bg-gray-700/40 p-3">
                <span className="font-mono text-xs text-gray-400">#{question.id}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{question.title}</p>
                  <p className="truncate text-xs text-gray-400">{question.scenario}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {question.options.length} alternativas · correta:{' '}
                    {LETTERS[question.options.findIndex((option) => option.is_correct)] ?? '?'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(question)}
                  className="rounded-lg border border-gray-600 px-3 py-1 text-xs font-semibold text-gray-200 hover:border-gray-400"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(question)}
                  className="rounded-lg border border-red-400/50 px-3 py-1 text-xs font-semibold text-red-200 hover:bg-red-900/40"
                >
                  Apagar
                </button>
              </div>
            ))}
            {bankQuestions.length === 0 && (
              <p className="text-sm text-gray-400">Nenhuma pergunta carregada ainda.</p>
            )}
          </div>

          {draft === null ? (
            <button
              type="button"
              onClick={() => { setFeedback(''); setDraft(emptyBankDraft()); }}
              className="w-full rounded-lg bg-green-700 px-4 py-3 font-bold text-white hover:bg-green-600"
            >
              ➕ Nova pergunta
            </button>
          ) : (
            <div className="space-y-3 rounded-lg border border-gray-600 bg-gray-900/60 p-4">
              <p className="text-sm font-bold text-gray-200">
                {draft.id === null ? 'Nova pergunta' : `Editando a pergunta #${draft.id}`}
              </p>
              <input
                type="text"
                value={draft.title}
                placeholder="Título curto"
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white"
              />
              <textarea
                value={draft.scenario}
                placeholder="O caso que as duplas vão ler"
                rows={3}
                onChange={(event) => setDraft({ ...draft, scenario: event.target.value })}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white"
              />
              {draft.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => markCorrect(index)}
                    aria-label={`Marcar a alternativa ${LETTERS[index]} como correta`}
                    className={`h-8 w-8 shrink-0 rounded-full text-sm font-bold ${option.is_correct ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-200'}`}
                  >
                    {LETTERS[index]}
                  </button>
                  <input
                    type="text"
                    value={option.option_text}
                    placeholder={`Alternativa ${LETTERS[index]}`}
                    onChange={(event) => setOptionText(index, event.target.value)}
                    className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setDraft({
                      ...draft,
                      options: draft.options.filter((_, position) => position !== index),
                    })}
                    disabled={draft.options.length <= MIN_BANK_OPTIONS}
                    className="shrink-0 rounded-lg border border-gray-600 px-2 py-2 text-xs text-gray-300 disabled:opacity-40"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setDraft({
                  ...draft,
                  options: [...draft.options, { option_text: '', is_correct: false }],
                })}
                disabled={draft.options.length >= MAX_BANK_OPTIONS}
                className="rounded-lg border border-gray-600 px-3 py-2 text-sm font-semibold text-gray-200 disabled:opacity-40"
              >
                + alternativa
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={isSaving}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-3 font-bold text-white hover:bg-red-500 disabled:opacity-60"
                >
                  {isSaving ? 'Salvando...' : 'Salvar pergunta'}
                </button>
                <button
                  type="button"
                  onClick={() => { setDraft(null); setFeedback(''); }}
                  className="rounded-lg border border-gray-600 px-4 py-3 font-semibold text-gray-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {(feedback || bankError) && (
        <p role="status" className={`mt-3 text-sm ${bankError ? 'text-red-300' : 'text-green-300'}`}>
          {bankError || feedback}
        </p>
      )}
    </section>
  );
}
