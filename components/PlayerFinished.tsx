import { useEffect, useState } from 'react';
import { useGameStore } from '../store/GameStore';
import { getBoardSize, questions, TEAM_COLORS } from '../data/questions';
import { TeamLogo } from './TeamLogo';
import { sortFinishers } from '../lib/finishOrder';

export function PlayerFinished() {
  const { game, players, currentPlayer, answers, loadGameState } = useGameStore();
  const [showConfetti, setShowConfetti] = useState(true);
  const [showPodium, setShowPodium] = useState(false);
  const boardSize = getBoardSize(game?.question_order?.length ?? questions.length);

  useEffect(() => {
    loadGameState();
    const interval = setInterval(loadGameState, 3000);

    const timer = setTimeout(() => setShowPodium(true), 2000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [loadGameState]);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const playersWithCurrent = currentPlayer
    ? [
        ...players.filter(player => player.id !== currentPlayer.id),
        currentPlayer,
      ]
    : players;
  const finishedPlayers = playersWithCurrent.filter(player => player.position >= boardSize);
  const podiumSize = Math.max(1, Math.min(3, playersWithCurrent.length));
  const podiumReady = finishedPlayers.length >= podiumSize && podiumSize > 0;
  const orderedFinishers = sortFinishers(finishedPlayers, answers);

  const sortedPlayers = [...playersWithCurrent].sort((a, b) => {
    if (a.position >= boardSize && b.position >= boardSize) return 0;
    if (a.position >= boardSize) return -1;
    if (b.position >= boardSize) return 1;
    return b.position - a.position;
  });

  const currentFinishPosition = orderedFinishers.findIndex(
    player => player.id === currentPlayer?.id,
  ) + 1;
  const myPosition = currentFinishPosition === 1
    ? 1
    : podiumReady && currentFinishPosition > 1
      ? currentFinishPosition
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
            <span className="text-yellow-400">CHEGOU!</span>
          </h2>
          <p className="text-gray-400 mb-4 text-lg">
            {currentPlayer?.team_name} cruzou a linha de chegada!
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

        {podiumReady && (
        <div className={`transition-all duration-1000 delay-500 ${showPodium ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 border-2 border-gray-700 rounded-2xl p-8 mb-6">
            <h3 className="text-xl font-black mb-6 uppercase tracking-wider">
              <span className="text-yellow-400">PÓDIO</span> F1
            </h3>
            
            <div className="flex min-h-[360px] items-end justify-center gap-2 pt-8 sm:gap-4">
              {/* P2 */}
              {podium[1] && (
                <div className="flex flex-col items-center animate-slideUp" style={{ animationDelay: '0.8s' }}>
                  <div className="w-20 h-20 rounded-full mb-2 flex items-center justify-center text-3xl border-4 border-gray-400"
                    style={{ backgroundColor: TEAM_COLORS[podium[1].f1_team] }}>
                    <TeamLogo team={podium[1].f1_team} />
                  </div>
                  <p className="font-bold text-sm truncate max-w-[100px] mb-1">{podium[1].team_name}</p>
                  <p className="text-gray-400 text-xs mb-2">{podium[1].f1_team}</p>
                  <div className="w-24 h-28 bg-gradient-to-b from-gray-300 to-gray-500 rounded-t-xl flex items-center justify-center relative">
                    <span className="text-5xl font-black text-white">2</span>
                    <div className="absolute top-2 text-gray-600 text-xs font-bold">P2</div>
                  </div>
                </div>
              )}
              
              {/* P1 */}
              {podium[0] && (
                <div className="flex flex-col items-center animate-slideUp" style={{ animationDelay: '0.4s' }}>
                  <div className="w-24 h-24 rounded-full mb-2 flex items-center justify-center text-4xl border-4 border-yellow-400 shadow-lg shadow-yellow-400/30"
                    style={{ backgroundColor: TEAM_COLORS[podium[0].f1_team] }}>
                    <TeamLogo team={podium[0].f1_team} />
                  </div>
                  <p className="font-bold text-sm truncate max-w-[120px] mb-1">{podium[0].team_name}</p>
                  <p className="text-gray-400 text-xs mb-2">{podium[0].f1_team}</p>
                  <div className="w-28 h-36 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-t-xl flex items-center justify-center relative">
                    <span className="text-6xl font-black text-white">1</span>
                    <div className="absolute top-2 text-yellow-800 text-xs font-bold">P1</div>
                  </div>
                </div>
              )}
              
              {/* P3 */}
              {podium[2] && (
                <div className="flex flex-col items-center animate-slideUp" style={{ animationDelay: '1.2s' }}>
                  <div className="w-20 h-20 rounded-full mb-2 flex items-center justify-center text-3xl border-4 border-orange-400"
                    style={{ backgroundColor: TEAM_COLORS[podium[2].f1_team] }}>
                    <TeamLogo team={podium[2].f1_team} />
                  </div>
                  <p className="font-bold text-sm truncate max-w-[100px] mb-1">{podium[2].team_name}</p>
                  <p className="text-gray-400 text-xs mb-2">{podium[2].f1_team}</p>
                  <div className="w-24 h-20 bg-gradient-to-b from-orange-400 to-orange-600 rounded-t-xl flex items-center justify-center relative">
                    <span className="text-5xl font-black text-white">3</span>
                    <div className="absolute top-2 text-orange-800 text-xs font-bold">P3</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

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
