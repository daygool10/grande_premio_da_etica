import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Radio } from 'lucide-react';
import { useGameStore } from '../store/GameStore';
import { boardScale, TEAM_COLORS } from '../data/questions';
import { getEngineerMessage } from '../lib/engineerMessages';
import { assetPath } from '../lib/assetPath';
import { TeamLogo } from './TeamLogo';

export function PlayerPlaying() {
  const { 
    game, currentPlayer, currentQuestion, players, 
    answers, selectedOption, hasAnswered,
    selectOption, submitAnswer, loadGameState, setViewState
  } = useGameStore();
  const [displayQuestionIndex, setDisplayQuestionIndex] = useState(
    () => game?.current_question_index ?? 0,
  );
  const [engineerMessage, setEngineerMessage] = useState('');
  const lastEngineerMessage = useRef('');
  const announcedQuestion = useRef('');
  const radioAudioRef = useRef<HTMLAudioElement | null>(null);
  const boardSize = boardScale(useGameStore((state) => state.dealtQuestions.length));
  const answerKey = useGameStore((state) => state.answerKey);

  useEffect(() => {
    loadGameState();
    const interval = setInterval(loadGameState, 1500);
    return () => clearInterval(interval);
  }, [loadGameState]);

  useEffect(() => {
    if (game?.phase === 'finished') {
      setViewState('player_finished');
    }
  }, [game?.phase, setViewState]);

  useEffect(() => {
    if (!game || game.current_question_index <= displayQuestionIndex) return;

    const timer = window.setTimeout(() => {
      setDisplayQuestionIndex(game.current_question_index);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [game?.current_question_index, displayQuestionIndex]);

  useEffect(() => {
    if (game?.phase === 'question' && !game?.question_revealed) {
      setViewState('player_playing');
    }
  }, [game?.phase, game?.question_revealed, setViewState]);

  useEffect(() => {
    const lastAnswer = answers
      .filter(answer => answer.player_id === currentPlayer?.id)
      .reduce<typeof answers[number] | null>(
        (latest, answer) => !latest || answer.question_index > latest.question_index ? answer : latest,
        null,
      );
    const finishAnswerRevealed = game?.question_revealed ||
      game?.phase === 'finished' ||
      (lastAnswer !== null && game && game.current_question_index > lastAnswer.question_index);

    if (
      finishAnswerRevealed &&
      currentPlayer &&
      game?.phase === 'finished'
    ) {
      setViewState('player_finished');
    }
  }, [
    game?.phase,
    game?.question_revealed,
    game?.current_question_index,
    currentPlayer?.id,
    answers,
    setViewState,
  ]);

  const q = currentQuestion;
  const isQuestionAdvancing = Boolean(
    game && game.current_question_index > displayQuestionIndex,
  );
  const completedAnswer = currentPlayer && answers.find(
    (answer) =>
      answer.player_id === currentPlayer.id &&
      answer.question_index === displayQuestionIndex,
  );

  useEffect(() => {
    if (!game || !currentPlayer || !isQuestionAdvancing || !completedAnswer) return;

    const announcementKey = `${game.id}:${game.current_question_index}:${currentPlayer.id}`;
    if (announcedQuestion.current === announcementKey) return;
    announcedQuestion.current = announcementKey;

    const { text } = getEngineerMessage({
      player: currentPlayer,
      players,
      answers,
      questionIndex: displayQuestionIndex,
      boardSize,
      previousMessage: lastEngineerMessage.current,
    });
    lastEngineerMessage.current = text;
    setEngineerMessage(text);

    const radioAudio = radioAudioRef.current;
    if (radioAudio) {
      radioAudio.currentTime = 0;
      radioAudio.volume = 0.6;
      void radioAudio.play().catch(() => {
        // Navegadores podem bloquear áudio antes da primeira interação do usuário.
      });
    }
  }, [
    answers,
    boardSize,
    currentPlayer,
    completedAnswer,
    displayQuestionIndex,
    game,
    isQuestionAdvancing,
    players,
  ]);

  useEffect(() => {
    if (!engineerMessage) return;
    const timer = window.setTimeout(() => setEngineerMessage(''), 6000);
    return () => window.clearTimeout(timer);
  }, [engineerMessage]);

  if (!q || !currentPlayer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Carregando...</div>
      </div>
    );
  }

  const selectedAnswer = selectedOption === null ? null : q.options.find((option) => option.option_index === selectedOption);
  const currentAnswer = currentPlayer && answers.find(
    (answer) => answer.player_id === currentPlayer.id && answer.question_index === game?.current_question_index,
  );
  const correctnessField = globalThis.String.fromCharCode(105, 115, 95, 99, 111, 114, 114, 101, 99, 116) as 'is_correct';
  const resultMessage = selectedAnswer
    ? currentAnswer?.[correctnessField]
      ? '✅ Resposta correta! Avanço definido pelo tempo de resposta.'
      : '❌ Resposta incorreta. Continue tentando na próxima rodada!'
    : '';

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#1a1a2e] p-4">
      <img
        src={assetPath('/player-question-background.png')}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full scale-105 object-cover opacity-90 blur-sm"
      />
      <div className="absolute inset-0 -z-10 bg-[#101322]/75" />
      <audio ref={radioAudioRef} src={assetPath('/radio-message.mp3')} preload="auto" />
      <AnimatePresence>
        {engineerMessage && (
          <motion.aside
            key={engineerMessage}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            role="status"
            aria-live="polite"
            className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-2xl items-center gap-4 rounded-xl border border-cyan-300/40 border-l-4 border-l-cyan-300 bg-[#101b27]/95 px-5 py-4 text-left shadow-2xl backdrop-blur-md sm:px-6"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-300/15 text-cyan-200">
              <Radio className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
                Rádio da equipe · {currentPlayer.team_name}
              </span>
              <span className="mt-1 block text-base font-semibold leading-snug text-white sm:text-lg">
                {engineerMessage}
              </span>
            </span>
          </motion.aside>
        )}
      </AnimatePresence>
      <div className="relative z-10 mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
              style={{ backgroundColor: TEAM_COLORS[currentPlayer.f1_team] }}
            >
              <TeamLogo team={currentPlayer.f1_team} />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">{currentPlayer.team_name}</p>
              <p className="text-gray-400 text-xs">{currentPlayer.f1_team}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Pergunta {(game?.current_question_index || 0) + 1}</p>
            <p className="text-xs text-gray-500">Posição: {currentPlayer.position}/{boardSize}</p>
          </div>
        </div>

        {/* Question */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-5 mb-4">
          <h3 className="text-red-400 font-bold mb-3 text-base uppercase tracking-wider sm:text-lg">
            📋 {q.title}
          </h3>
          <p className="text-gray-300 leading-relaxed text-base sm:text-lg">
            {q.scenario}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => selectOption(opt.option_index)}
              disabled={hasAnswered}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    game?.question_revealed && hasAnswered
                  ? opt.option_index === answerKey
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
                <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0 ${
                    selectedOption === opt.option_index
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-600 text-gray-300'
                }`}>
                  {String.fromCharCode(65 + i)}
                </span>
                <div className="flex-1">
                  <p className="text-base leading-relaxed text-gray-200 sm:text-lg">{opt.text}</p>
                </div>
                {game?.question_revealed && hasAnswered && opt.option_index === answerKey && (
                  <span className="text-green-400 text-xl">✓</span>
                )}
                {game?.question_revealed && hasAnswered && selectedOption === opt.option_index && opt.option_index !== answerKey && (
                  <span className="text-red-400 text-xl">✗</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Submit Button */}
        {!hasAnswered && (
          <button
            onClick={() => void submitAnswer()}
            disabled={selectedOption === null}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-xl text-xl transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100"
          >
            Confirmar Resposta
          </button>
        )}

        {/* Result Message - only after admin reveals */}
        {game?.question_revealed && hasAnswered && (
          <div className={`mt-4 p-4 rounded-xl text-center font-bold text-lg ${
            currentAnswer?.[correctnessField]
              ? 'bg-green-900/50 text-green-400 border border-green-700'
              : 'bg-red-900/50 text-red-400 border border-red-700'
          }`}>
            {resultMessage}
            {currentAnswer?.response_time_ms !== null && currentAnswer?.response_time_ms !== undefined && ` Tempo: ${currentAnswer.response_time_ms} ms.`}
          </div>
        )}

        {/* Waiting for admin to reveal */}
        {hasAnswered && !game?.question_revealed && (
          <div className="mt-4 text-center text-gray-400 text-sm animate-pulse bg-gray-800/50 p-4 rounded-xl border border-gray-700">
            ✅ Resposta enviada! Aguardando o admin revelar a resposta correta...
          </div>
        )}

        {/* After reveal - waiting for next question */}
        {hasAnswered && game?.question_revealed && (
          <div className="mt-4 text-center text-gray-400 text-sm animate-pulse">
            Aguardando próxima pergunta...
          </div>
        )}
      </div>
    </div>
  );
}
