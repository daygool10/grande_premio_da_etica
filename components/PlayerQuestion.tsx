import { useLayoutEffect, useRef, useState } from 'react';
import type { Question } from '../data/questions';

interface PlayerQuestionProps {
  question: Question;
  selectedOption: number | null;
  hasAnswered: boolean;
  revealed: boolean;
  selectOption: (optionIndex: number) => void;
  submitAnswer: () => void;
}

export function PlayerQuestion({
  question,
  selectedOption,
  hasAnswered,
  revealed,
  selectOption,
  submitAnswer,
}: PlayerQuestionProps) {
  const [expanded, setExpanded] = useState(false);
  const [canToggle, setCanToggle] = useState(false);
  const scenarioRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    if (expanded) return;
    const el = scenarioRef.current;
    if (el) setCanToggle(el.scrollHeight - el.clientHeight > 1);
  }, [expanded, question.scenario]);

  return (
    <>
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-5 mb-4">
        <h3 className="text-red-400 font-bold mb-2 text-sm uppercase tracking-wider">
          📋 {question.title}
        </h3>
        <p
          ref={scenarioRef}
          className={`text-gray-300 leading-relaxed text-sm ${expanded ? '' : 'line-clamp-3 sm:line-clamp-none'}`}
        >
          {question.scenario}
        </p>
        {canToggle && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="mt-2 text-sm font-bold text-red-400 hover:text-red-300"
          >
            Ver caso completo
          </button>
        )}
        {canToggle && expanded && (
          <button
            onClick={() => setExpanded(false)}
            className="mt-2 text-sm font-bold text-red-400 hover:text-red-300"
          >
            Mostrar menos
          </button>
        )}
      </div>

      <div className="space-y-3 mb-6">
        {question.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => selectOption(i)}
            disabled={hasAnswered}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
              revealed && hasAnswered
                ? opt.isCorrect
                  ? 'bg-green-900/30 border-green-500/50'
                  : selectedOption === i
                  ? 'bg-red-900/30 border-red-500/50'
                  : 'bg-gray-800/30 border-gray-700/50 opacity-50'
                : hasAnswered
                ? 'bg-gray-700/30 border-gray-600/50'
                : selectedOption === i
                ? 'bg-red-600/20 border-red-500'
                : 'bg-gray-800/50 border-gray-700 hover:border-gray-500'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                selectedOption === i
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}>
                {String.fromCharCode(65 + i)}
              </span>
              <div className="flex-1">
                <p className="text-sm text-gray-200">{opt.text}</p>
              </div>
              {revealed && hasAnswered && opt.isCorrect && (
                <span className="text-green-400 text-xl">✓</span>
              )}
              {revealed && hasAnswered && selectedOption === i && !opt.isCorrect && (
                <span className="text-red-400 text-xl">✗</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {!hasAnswered && (
        <button
          onClick={submitAnswer}
          disabled={selectedOption === null}
          className="w-full bg-red-600 sticky bottom-0 z-10 sm:static bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-xl text-xl transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100"
        >
          Confirmar Resposta
        </button>
      )}
    </>
  );
}