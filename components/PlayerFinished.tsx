import { useEffect, useState } from 'react';
import { useGameStore } from '../store/GameStore';
import { raceFinishLine } from '../store/raceProgress';
import { TEAM_COLORS } from '../lib/teams';
import { rankPlayers, accumulateSpeedRanks } from '../lib/scoring';
import { clearSeat } from '../lib/seat';
import { playCue } from '../lib/sound';
import { PodiumArrival } from './PodiumArrival';

export function PlayerFinished() {
  const { players, currentPlayer, answers, game, loadGameState, setViewState } = useGameStore();
  const [showPodium, setShowPodium] = useState(false);

  useEffect(() => {
    loadGameState();
    const timer = setTimeout(() => setShowPodium(true), 2000);
    return () => clearTimeout(timer);
  }, [loadGameState]);

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

  const speedRanks = accumulateSpeedRanks(answers);
  const scores = new Map(playersWithCurrent.map(p => [p.id, p.position]));
  const classification = rankPlayers(playersWithCurrent, scores, speedRanks);
  const finishLine = raceFinishLine(game);
  const winner = classification[0];
  const myRank = classification.findIndex(player => player.id === currentPlayer?.id) + 1;
  const podium = classification.slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
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
            <span className="text-yellow-400">CORRIDA ENCERRADA!</span>
          </h2>
          <p className="text-gray-400 mb-4 text-lg">
            {winner ? `${winner.team_name} venceu o Grande Prêmio da Ética!` : 'Fim da corrida!'}
          </p>
          
          <div className="inline-block bg-gray-800/50 border border-yellow-500/50 rounded-xl px-8 py-4 mb-8">
            <p className="text-gray-400 text-sm mb-1">Sua posição</p>
            <p className="text-7xl font-black text-yellow-400">
              {myRank > 0 ? `${myRank}º` : '…'}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {currentPlayer?.position}/{finishLine} pontos
            </p>
          </div>
        </div>

        {/* F1 Style Podium */}
        <PodiumArrival podium={podium} showPodium={showPodium} />

        {/* Full Classification */}
        <div className={`transition-all duration-1000 delay-700 ${showPodium ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Classificação Final</h3>
            <div className="space-y-2">
              {classification.map((p, i) => (
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
                  <span className="text-sm font-bold">{p.position}/{finishLine}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => { clearSeat(); setViewState('start'); }}
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3 px-8 rounded-xl text-lg transition-all"
        >
          Voltar ao início
        </button>
      </div>
    </div>
  );
}