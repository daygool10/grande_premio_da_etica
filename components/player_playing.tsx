import { useEffect, useState } from 'react';
import { useGameStore } from '../store/GameStore';
import { getBoardSize, questions, TEAM_COLORS } from '../data/questions';
import { TeamLogo } from './TeamLogo';
import { F1Car } from './F1Car';

interface PlayerPitStopProps {
  teamName: string;
  f1Team: string;
  launching?: boolean;
  resultMessage?: string;
}

function PlayerPitStop({ teamName, f1Team, launching = false, resultMessage }: PlayerPitStopProps) {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#1a1a2e] p-4">
      <img
        src="/player-question-background.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full scale-105 object-cover opacity-90 blur-sm"
      />
      <div className="absolute inset-0 -z-10 bg-[#101322]/75" />
      <section className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center" role="status" aria-live="polite">
        <p className="text-2xl font-black text-white sm:text-3xl">
          {launching ? 'Voltando para a pista!' : 'Pit stop'}
        </p>
        <p className="mt-2 text-base text-gray-300 sm:text-lg">
          {launching
            ? `${teamName}, próxima parada: a nova pergunta!`
            : `${teamName}, a equipe está trocando os pneus.`}
        </p>
        <div className={`relative mt-10 aspect-square w-full max-w-[min(76vw,340px)] ${launching ? 'pit-stop-launch' : 'pit-stop-car'}`}>
          <F1Car team={f1Team} className="h-full w-full drop-shadow-2xl" />
        </div>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-red-300">
          {launching ? 'Acelerando...' : 'Trocando para pneus novos'}
        </p>
        {resultMessage && (
          <p className="mt-5 rounded-xl border border-white/10 bg-gray-900/70 px-5 py-3 text-lg font-bold text-white">
            {resultMessage}
          </p>
        )}
        {!launching && (
          <p className="mt-3 animate-pulse text-gray-400">Aguardando a próxima pergunta...</p>
        )}
      </section>
    </main>
  );
}

export function PlayerPlaying() {
  const { 
    game, currentPlayer, currentQuestion, players, 
    answers, selectedOption, hasAnswered, showResult,
    selectOption, submitAnswer, loadGameState, setViewState
  } = useGameStore();
  const [displayQuestionIndex, setDisplayQuestionIndex] = useState(
    () => game?.current_question_index ?? 0,
  );

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
      currentPlayer.position >= boardSize
    ) {
      setViewState('player_finished');
    }
  }, [
    game?.phase,
    game?.question_revealed,
    game?.current_question_index,
    currentPlayer?.id,
    currentPlayer?.position,
    answers,
    setViewState,
  ]);

  const q = currentQuestion;
  const boardSize = getBoardSize(game?.question_order?.length ?? questions.length);

  if (!q || !currentPlayer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Carregando...</div>
      </div>
    );
  }

  const selectedAnswer = selectedOption === null ? null : q.options[selectedOption];
  const hasAnsweredCurrentQuestion = answers.some(
    (answer) =>
      answer.player_id === currentPlayer.id &&
      answer.question_index === game?.current_question_index,
  );
  const resultMessage = selectedAnswer
    ? selectedAnswer.isCorrect
      ? `✅ Acertou! Avance ${selectedAnswer.advance} casa${selectedAnswer.advance > 1 ? 's' : ''}!`
      : `❌ Errou! ${selectedAnswer.penalty || 'Não avance nesta rodada.'}`
    : '';

  if (game && game.current_question_index > displayQuestionIndex) {
    return (
      <PlayerPitStop
        teamName={currentPlayer.team_name}
        f1Team={currentPlayer.f1_team}
        launching
      />
    );
  }

  if (currentPlayer.skipped_turn && !hasAnsweredCurrentQuestion) {
    return (
      <PlayerPitStop
        teamName={currentPlayer.team_name}
        f1Team={currentPlayer.f1_team}
      />
    );
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#1a1a2e] p-4">
      <img
        src="/player-question-background.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full scale-105 object-cover opacity-90 blur-sm"
      />
      <div className="absolute inset-0 -z-10 bg-[#101322]/75" />
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
              onClick={() => selectOption(i)}
              disabled={hasAnswered}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                game?.question_revealed && hasAnswered
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
                <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0 ${
                  selectedOption === i
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-600 text-gray-300'
                }`}>
                  {String.fromCharCode(65 + i)}
                </span>
                <div className="flex-1">
                  <p className="text-base leading-relaxed text-gray-200 sm:text-lg">{opt.text}</p>
                </div>
                {game?.question_revealed && hasAnswered && opt.isCorrect && (
                  <span className="text-green-400 text-xl">✓</span>
                )}
                {game?.question_revealed && hasAnswered && selectedOption === i && !opt.isCorrect && (
                  <span className="text-red-400 text-xl">✗</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Submit Button */}
        {!hasAnswered && (
          <button
            onClick={submitAnswer}
            disabled={selectedOption === null}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-xl text-xl transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100"
          >
            Confirmar Resposta
          </button>
        )}

        {/* Result Message - only after admin reveals */}
        {game?.question_revealed && hasAnswered && (
          <div className={`mt-4 p-4 rounded-xl text-center font-bold text-lg ${
            selectedAnswer?.isCorrect
              ? 'bg-green-900/50 text-green-400 border border-green-700'
              : 'bg-red-900/50 text-red-400 border border-red-700'
          }`}>
            {resultMessage}
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
