import { useEffect, useState } from 'react';
import { useGameStore, raceFinishLine } from '../store/GameStore';
import { TEAM_COLORS } from '../data/questions';
import { TeamLogo } from './TeamLogo';
import { rankPlayers, accumulateSpeedRanks } from '../lib/scoring';
import { F1Semaphore } from './F1Semaphore';

export function AdminFinished() {
  const { players, answers, game, loadGameState, setViewState } = useGameStore();
  const [showPodium, setShowPodium] = useState(false);

  useEffect(() => {
    loadGameState();
    const interval = setInterval(loadGameState, 3000);
    const timer = setTimeout(() => setShowPodium(true), 500);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [loadGameState]);

  const speedRanks = accumulateSpeedRanks(answers);
  const scores = new Map(players.map((player) => [player.id, player.position]));
  const classification = rankPlayers(players, scores, speedRanks);
  const finishLine = raceFinishLine(game);
  const winner = classification[0];
  const podium = classification.slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Checkered Flag Pattern */}
      <div className="absolute top-0 left-0 right-0 h-4 bg-[repeating-linear-gradient(90deg,#000_0px,#000_20px,#fff_20px,#fff_40px)]"></div>
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-[repeating-linear-gradient(90deg,#fff_0px,#fff_20px,#000_20px,#000_40px)]"></div>

      <div className="max-w-2xl w-full text-center relative z-10">
        <div className="mb-5 flex justify-center">
          <F1Semaphore status="finished" />
        </div>
        <div className={`transition-all duration-1000 ${showPodium ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="mb-6">
            <span className="text-8xl">🏆</span>
          </div>
          
          <h2 className="text-5xl font-black mb-2">
            <span className="text-yellow-400">PODIO</span>
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            {winner ? `${winner.team_name} vence o Grande Prêmio da Ética!` : 'Resultados finais da corrida'}
          </p>
        </div>

        {/* F1 Style Podium */}
        <div className={`transition-all duration-1000 delay-500 ${showPodium ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 border-2 border-gray-700 rounded-2xl p-8 mb-6">
            <h3 className="mb-6 text-xl font-black uppercase tracking-wider">
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
                    <div className="absolute -top-4 text-3xl">👑</div>
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

        {/* Full Classification */}
        <div className={`transition-all duration-1000 delay-700 ${showPodium ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Classificação Final</h3>
            <div className="space-y-2">
              {classification.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 bg-gray-700/30 rounded-lg p-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    i === 0 ? 'bg-yellow-500 text-black' :
                    i === 1 ? 'bg-gray-400 text-black' :
                    i === 2 ? 'bg-orange-500 text-white' :
                    'bg-gray-600 text-gray-300'
                  }`}>
                    {i + 1}º
                  </span>
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: TEAM_COLORS[p.f1_team] }} />
                  <span className="font-bold flex-1 text-left">{p.team_name}</span>
                  <span className="text-gray-400 text-sm">{p.f1_team}</span>
                  <span className="text-sm font-bold">{p.position}/{finishLine}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => setViewState('start')}
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3 px-8 rounded-xl text-lg transition-all"
        >
          🏁 Nova Partida
        </button>
      </div>
    </div>
  );
}