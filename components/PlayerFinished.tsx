import { useEffect, useState } from 'react';
import { useGameStore } from '../store/GameStore';
import { questions } from '../data/questions';
import { TEAM_COLORS } from '../lib/teams';
import { sortFinishers } from '../lib/finishOrder';
import { finishLineForOrder, hasReachedFinishLine } from '../lib/raceScoring';
import { PodiumArrival } from './PodiumArrival';
import { playCue } from '../lib/sound';

export function PlayerFinished() {
  const { game, players, currentPlayer, answers, loadGameState } = useGameStore();
  const [showConfetti, setShowConfetti] = useState(true);
  const [showPodium, setShowPodium] = useState(false);
  const finishLine = finishLineForOrder(game?.question_order, questions);

  useEffect(() => {
    loadGameState();

    const timer = setTimeout(() => setShowPodium(true), 2000);
    
    return () => {
      clearTimeout(timer);
    };
  }, [loadGameState]);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showPodium) return;
    playCue('podium');
  }, [showPodium]);

  const playersWithCurrent = currentPlayer
    ? [
        ...players.filter(player => player.id !== currentPlayer.id),
        currentPlayer,
      ]
    : players;
  const finishedPlayers = playersWithCurrent.filter(player => hasReachedFinishLine(player.position, finishLine));
  const podiumSize = Math.max(1, Math.min(3, playersWithCurrent.length));
  const podiumReady = game?.phase === 'finished' || (finishedPlayers.length >= podiumSize && podiumSize > 0);
  const orderedFinishers = sortFinishers(finishedPlayers, answers);
  const sortedPlayers = [
    ...orderedFinishers,
    ...playersWithCurrent
      .filter(player => player.position < finishLine)
      .sort((a, b) => b.position - a.position),
  ];

  const currentFinishPosition = orderedFinishers.findIndex(
    player => player.id === currentPlayer?.id,
  ) + 1;
  const currentStandingPosition = sortedPlayers.findIndex(
    player => player.id === currentPlayer?.id,
  ) + 1;
  const myPosition = currentFinishPosition > 0
    ? currentFinishPosition
    : game?.phase === 'finished' && currentStandingPosition > 0
      ? currentStandingPosition
      : null;
  const isFirstFinisher = myPosition === 1;
  const podium = orderedFinishers.slice(0, 3);
  const remainingFinishers = Math.max(0, podiumSize - finishedPlayers.length);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'][Math.floor(Math.random() * 6)],
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Checkered Flag Pattern */}
      <div className="absolute top-0 left-0 right-0 h-4 bg-[repeating-linear-gradient(90deg,#000_0px,#000_20px,#fff_20px,#fff_40px)]"></div>
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-[repeating-linear-gradient(90deg,#fff_0px,#fff_20px,#000_20px,#000_40px)]"></div>

      <div className="max-w-2xl w-full text-center relative z-10">
        {/* Finish Line Celebration */}
        <div className={`transition-all duration-1000 ${showPodium ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="mb-6">
            <span className="text-8xl animate-bounce">🏆</span>
          </div>
          
          <h2 className="text-5xl font-black mb-2">
            <span className="text-yellow-400">
              {currentPlayer && hasReachedFinishLine(currentPlayer.position, finishLine) ? 'CHEGOU!' : 'FIM DA CORRIDA'}
            </span>
          </h2>
          <p className="text-gray-400 mb-4 text-lg">
            {currentPlayer && hasReachedFinishLine(currentPlayer.position, finishLine)
              ? `${currentPlayer.team_name} cruzou a linha de chegada!`
              : `A corrida terminou. ${currentPlayer?.team_name} avançou ${currentPlayer?.position ?? 0} de ${finishLine} pontos.`}
          </p>
          
          <div className="inline-block bg-gray-800/50 border border-yellow-500/50 rounded-xl px-8 py-4 mb-8">
            <p className="text-gray-400 text-sm mb-1">Sua posição</p>
            <p className="text-7xl font-black text-yellow-400">
              {myPosition ? `${myPosition}º` : '…'}
            </p>
          </div>
        </div>

        {/* F1 Style Podium */}
        {!podiumReady && (
          <div className="mb-6 rounded-xl border border-yellow-500/40 bg-yellow-900/20 p-5">
            <p className="text-lg font-bold text-yellow-300">
              {isFirstFinisher ? 'Você ficou em 1º lugar!' : 'Você cruzou a linha de chegada!'}
            </p>
            <p className="mt-2 text-gray-300">
              O pódio será gerado quando mais {remainingFinishers} equipe
              {remainingFinishers === 1 ? '' : 's'} cruzar
              {remainingFinishers === 1 ? '' : 'em'} a linha de chegada.
            </p>
          </div>
        )}

        {podiumReady && <PodiumArrival podium={podium} showPodium={showPodium} />}

        {/* Full Classification */}
        {podiumReady && <div className={`transition-all duration-1000 delay-700 ${showPodium ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Classificação</h3>
            <div className="space-y-2">
              {sortedPlayers.slice(0, 5).map((p, i) => (
                <div key={p.id} className={`flex items-center gap-3 rounded-lg p-2 ${
                  p.id === currentPlayer?.id ? 'bg-green-900/30 border border-green-700/50' : 'bg-gray-700/30'
                }`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                    i === 0 ? 'bg-yellow-500 text-black' :
                    i === 1 ? 'bg-gray-400 text-black' :
                    i === 2 ? 'bg-orange-500 text-white' :
                    'bg-gray-600 text-gray-300'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TEAM_COLORS[p.f1_team] }} />
                  <span className="font-bold text-sm flex-1 text-left">{p.team_name}</span>
                  <span className="text-gray-400 text-xs">{p.f1_team}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        }

        {podiumReady && (
          <p className="mt-6 text-gray-500 text-sm animate-pulse">Pódio completo!</p>
        )}
      </div>
    </div>
  );
}
