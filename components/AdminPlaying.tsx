import { useEffect, useState } from 'react';
import { useGameStore } from '../store/GameStore';
import {
  TEAM_COLORS,
  getBoardSize,
  questions,
  getQuestionAt,
} from '../data/questions';
import { CircuitBoard } from './CircuitBoard';
import { F1Semaphore } from './F1Semaphore';
import { sortFinishers } from '../lib/finishOrder';

export function AdminPlaying() {
  const { game, players, currentQuestion, revealAnswer, nextQuestion, loadGameState, setViewState, answers } = useGameStore();
  const [isRevealing, setIsRevealing] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [revealError, setRevealError] = useState('');

  useEffect(() => {
    loadGameState();
    const interval = setInterval(loadGameState, 1500);
    return () => clearInterval(interval);
  }, [loadGameState]);

  useEffect(() => {
    if (game?.phase === 'finished') {
      setViewState('admin_finished');
    }
  }, [game?.phase, setViewState]);

  const q = currentQuestion || getQuestionAt(
    game?.current_question_index || 0,
    game?.question_order,
  );
  const questionCount = game?.question_order?.length ?? questions.length;
  const boardSize = getBoardSize(game?.question_order?.length ?? questions.length);

  const eligiblePlayers = players.filter((player) => player.position < boardSize);
  const answeredCount = eligiblePlayers.filter(p => {
    return answers.some(a => a.player_id === p.id && a.question_index === game?.current_question_index);
  }).length;
  const allPlayersAnswered = players.length > 0 && answeredCount === eligiblePlayers.length;
  const finishedPlayers = players.filter(player => player.position >= boardSize);
  const orderedFinishers = sortFinishers(finishedPlayers, answers);
  const podiumSize = Math.max(1, Math.min(3, players.length));
  const podiumReady = finishedPlayers.length >= podiumSize;

  const handleRevealAnswer = async () => {
    if (!allPlayersAnswered || isRevealing) return;
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
    <div className="min-h-screen p-4 bg-[#1a1a2e]">
      <div className="mx-auto w-full max-w-[1800px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="inline-block bg-red-600 px-3 py-1 rounded text-sm font-bold">F1</span>
            <h2 className="text-xl font-bold">Pergunta {(game?.current_question_index || 0) + 1}/{questionCount}</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              game?.question_revealed ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'
            }`}>
              {game?.question_revealed ? '✅ Resposta Revelada' : `⏳ ${answeredCount}/${eligiblePlayers.length} responderam`}
            </span>
            <span className="text-gray-400 text-sm">Código: <span className="text-white font-mono font-bold">{game?.game_code}</span></span>
          </div>
        </div>

        <section className="mb-6 bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 border-2 border-gray-700 rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🏁</span>
              <h3 className="text-lg font-black uppercase tracking-wider text-white">Tabuleiro da Corrida</h3>
              <span className="text-gray-500 text-sm ml-auto">Tempo real</span>
              <F1Semaphore status={podiumReady ? 'finished' : 'running'} />
            </div>
            <CircuitBoard players={players} boardSize={boardSize} />
        </section>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          {/* Question Section */}
          <div className="space-y-4 lg:col-span-2">
            {q && (
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6">
                <h3 className="text-red-400 font-bold mb-2 text-sm uppercase tracking-wider">
                  📋 {q.title}
                </h3>
                <p className="text-gray-300 leading-relaxed text-sm mb-6">
                  {q.scenario}
                </p>

                <div className="space-y-3">
                  {q.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-lg border transition-all ${
                        game?.question_revealed && opt.isCorrect
                          ? 'bg-green-900/30 border-green-500/50'
                          : 'bg-gray-700/30 border-gray-600/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          game?.question_revealed && opt.isCorrect
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-600 text-gray-300'
                        }`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm text-gray-200">{opt.text}</p>
                        </div>
                        {game?.question_revealed && opt.isCorrect && (
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
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-xl text-lg transition-all"
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
                  <p role="alert" className="mt-3 text-center text-sm text-red-400">{revealError}</p>
                )}
              </div>
            )}
          </div>

          {/* Teams Status Panel */}
          <div className="space-y-4">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">👥 Equipes Conectadas</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {players.map(p => {
                  const hasAnswered = answers.some(a => a.player_id === p.id && a.question_index === game?.current_question_index);
                  return (
                    <div key={p.id} className="flex items-center gap-3 bg-gray-700/30 rounded-lg p-3">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: TEAM_COLORS[p.f1_team] }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{p.team_name}</p>
                        <p className="text-gray-400 text-xs">{p.f1_team}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold">{p.position}/{boardSize}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          hasAnswered ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                        }`}>
                          {p.position >= boardSize
                            ? 'Finalizou'
                            : hasAnswered
                              ? 'Respondeu'
                              : 'Aguardando'}
                        </span>
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
    </div>
  );
}