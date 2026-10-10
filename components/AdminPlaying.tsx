import { useEffect, useState } from 'react';
import { useGameStore } from '../store/GameStore';
import {
  boardScale,
} from '../data/questions';
import { sortFinishers } from '../lib/finishOrder';
import { TEAM_COLORS } from '../lib/teams';
import { CircuitBoard } from './CircuitBoard';
import { F1Semaphore } from './F1Semaphore';

export function AdminPlaying() {
  const { game, players, currentQuestion, revealAnswer, nextQuestion, loadGameState, setViewState, answers, revealDeltas, realtimeStatus } = useGameStore();
  const [isRevealing, setIsRevealing] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [revealError, setRevealError] = useState('');

  useEffect(() => {
    loadGameState();
  }, [loadGameState]);

  useEffect(() => {
    if (game?.phase !== 'question' || game.question_revealed) return;
    // Answers are RLS-gated before reveal, so only the admin refreshes this counter every 2 s.
    const interval = setInterval(() => void loadGameState(), 2000);
    return () => clearInterval(interval);
  }, [game?.phase, game?.question_revealed, loadGameState]);

  useEffect(() => {
    if (game?.phase === 'finished') {
      setViewState('admin_finished');
    }
  }, [game?.phase, setViewState]);

  const q = currentQuestion;
  const questionCount = useGameStore((state) => state.dealtQuestions.length);
  const answerKey = useGameStore((state) => state.answerKey);
  const boardSize = boardScale(questionCount);
  const finishedPlayers = players.filter((player) => player.position >= boardSize);
  const orderedFinishers = sortFinishers(finishedPlayers, answers);
  const podiumSize = Math.max(1, Math.min(3, players.length));
  const podiumReady = finishedPlayers.length >= podiumSize;
  const eligiblePlayers = players.filter((player) => player.position < boardSize);

  const answeredCount = eligiblePlayers.filter(p => {
    return answers.some(a => a.player_id === p.id && a.question_index === game?.current_question_index);
  }).length;
  const allPlayersAnswered = players.length > 0 && answeredCount === eligiblePlayers.length;

  const handleRevealAnswer = async () => {
    if (isRevealing) return;
    setIsRevealing(true);
    setRevealError('');
    try {
      await revealAnswer();
    } catch (error) {
      console.error('Error revealing answer and updating race positions:', error);
      setRevealError('Não foi possível revelar a resposta. Tente novamente.');
    } finally {
      setIsRevealing(false);
    }
  };

  const handleNextQuestion = async () => {
    if (isAdvancing) return;
    setIsAdvancing(true);
    setRevealError('');
    try {
      await nextQuestion();
    } catch (error) {
      console.error('Error advancing to the next question:', error);
      setRevealError('Não foi possível avançar para a próxima pergunta. Tente novamente.');
    } finally {
      setIsAdvancing(false);
    }
  };

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#1a1a2e] p-3 sm:p-5 lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      <div className="mx-auto flex w-full max-w-[2200px] flex-col gap-4 lg:h-full lg:gap-5">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-block rounded bg-red-600 px-3 py-1 text-base font-bold">F1</span>
            <h2 className="text-xl font-bold sm:text-2xl">Pergunta {(game?.current_question_index || 0) + 1}/{questionCount}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <span className={`rounded-full px-3 py-1 text-base font-bold ${
              game?.question_revealed ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'
            }`}>
              {game?.question_revealed ? '✅ Resposta Revelada' : `⏳ ${answeredCount}/${players.length} responderam`}
            </span>
            <span className="text-base text-gray-400">Código: <span className="font-mono font-bold text-white">{game?.game_code}</span></span>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] lg:grid-rows-1 lg:items-center lg:gap-5">
          <section aria-label="Tabuleiro da Corrida" className="order-1 min-w-0 rounded-2xl border-2 border-gray-700 bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 p-3 sm:p-5 lg:order-2 lg:self-center">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-2xl">🏁</span>
              <h3 className="text-lg font-black uppercase tracking-wider text-white">Tabuleiro da Corrida</h3>
              <span className="text-gray-500 text-sm ml-auto">Tempo real</span>
              <F1Semaphore status={podiumReady ? 'finished' : 'running'} />
            </div>
            <CircuitBoard players={players} boardSize={boardSize} />
        </section>

          <div className="order-2 min-w-0 space-y-4 lg:order-1 lg:max-h-full lg:overflow-y-auto lg:pr-1">
            {q && (
              <div className="rounded-xl border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 p-4 sm:p-6">
                <h3 className="mb-3 text-base font-bold uppercase tracking-wider text-red-400 sm:text-lg">
                  📋 {q.title}
                </h3>
                <p className="mb-5 text-base leading-relaxed text-gray-200 sm:text-lg">
                  {q.scenario}
                </p>

                <div className="space-y-3">
                  {q.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-lg border transition-all ${
                        game?.question_revealed && opt.option_index === answerKey
                          ? 'bg-green-900/30 border-green-500/50'
                          : 'bg-gray-700/30 border-gray-600/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          game?.question_revealed && opt.option_index === answerKey
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-600 text-gray-300'
                        }`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <div className="flex-1">
                          <p className="text-base leading-snug text-gray-100 sm:text-lg">{opt.text}</p>
                        </div>
                        {game?.question_revealed && opt.option_index === answerKey && (
                          <span className="text-green-400 text-xl">✓</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex gap-3">
                  {!game?.question_revealed ? (
                    <button
                      onClick={handleRevealAnswer}
                      disabled={!allPlayersAnswered || isRevealing}
                      className="flex-1 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl text-lg transition-all"
                    >
                      {isRevealing ? 'Revelando...' : '🔓 Revelar Resposta'}
                    </button>
                  ) : (
                    <button
                      onClick={handleNextQuestion}
                      disabled={isAdvancing}
                      className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-lg font-bold text-white transition-all hover:from-blue-500 hover:to-blue-600 sm:text-xl"
                    >
                      {isAdvancing ? 'Avançando...' : '➡️ Próxima Pergunta'}
                    </button>
                  )}
                </div>
                {!game?.question_revealed && eligiblePlayers.length === 0 && (
                  <p className="mt-3 text-center text-sm text-gray-400">
                    Nenhuma dupla precisa responder esta pergunta.
                  </p>
                )}
                {!game?.question_revealed && eligiblePlayers.length > 0 && !allPlayersAnswered && (
                  <p className="mt-3 text-center text-sm text-gray-400">
                    Aguardando todas as duplas elegíveis responderem ({answeredCount}/{eligiblePlayers.length}).
                  </p>
                )}
                {revealError && (
                  <p role="alert" className="mt-3 text-center text-base text-red-400">{revealError}</p>
                )}
              </div>
            )}
          </div>

          <div className="order-3 min-w-0 space-y-4 lg:max-h-full lg:overflow-y-auto lg:pr-1">
            <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
              <h3 className="mb-3 text-base font-bold uppercase tracking-wider text-gray-300 sm:text-lg">👥 Equipes Conectadas</h3>
              <div className="space-y-2 lg:max-h-[calc(100dvh-10rem)] lg:overflow-y-auto">
                {players.map(p => {
                   const hasAnswered = answers.some(a => a.player_id === p.id && a.question_index === game?.current_question_index);
                  const delta = revealDeltas.find((item) => item.player_id === p.id);
                  return (
                    <div key={p.id} className="flex items-center gap-3 rounded-lg bg-gray-700/30 p-3">
                      <div
                        className="h-4 w-4 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: TEAM_COLORS[p.f1_team] }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-base font-bold sm:text-lg">{p.team_name}</p>
                        <p className="text-sm text-gray-300">{p.f1_team}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold">{p.position}/{boardSize}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          hasAnswered ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                        }`}>
                           {hasAnswered
                               ? 'Respondeu'
                               : 'Aguardando'}
                        </span>
                        {delta && <p className="mt-1 text-xs text-gray-300">+{delta.advance} · {delta.response_time_ms ?? '-'} ms</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Podium Preview */}
            {finishedPlayers.length > 0 && (
              <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 border border-yellow-700/50 rounded-xl p-4">
                <h3 className="text-sm font-bold text-yellow-400 mb-3 uppercase tracking-wider">
                  {podiumReady ? '🏆 Pódio completo' : '🏁 Chegada'}
                </h3>
                {!podiumReady ? (
                  <p className="text-sm text-gray-300">
                    {orderedFinishers[0].team_name} está em 1º lugar. O pódio será gerado quando mais {podiumSize - finishedPlayers.length} equipe
                    {podiumSize - finishedPlayers.length === 1 ? '' : 's'} cruzar
                    {podiumSize - finishedPlayers.length === 1 ? '' : 'em'} a linha de chegada.
                  </p>
                ) : (
                  <div className="space-y-2">
                  {orderedFinishers.slice(0, 3).map((p, i) => (
                      <div key={p.id} className="flex items-center gap-2">
                        <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TEAM_COLORS[p.f1_team] }} />
                        <span className="font-bold text-sm">{p.team_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
