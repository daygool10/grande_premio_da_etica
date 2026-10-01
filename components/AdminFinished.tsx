import React from 'react';
import { useEffect, useState } from 'react';
import { useGameStore } from '../store/GameStore';
import { TEAM_COLORS } from '../lib/teams';
import { sortFinishers } from '../lib/finishOrder';
import { finishLineForOrder, hasReachedFinishLine } from '../server/shared/scoring.js';
import { F1Semaphore } from './F1Semaphore';
import { questions } from '../data/questions';
import { PodiumArrival } from './PodiumArrival';
import { playCue } from '../lib/sound';

export function AdminFinished() {
  const { game, players, answers, loadGameState, setViewState } = useGameStore();
  const [showPodium, setShowPodium] = useState(false);
  const finishLine = finishLineForOrder(game?.question_order, questions);

  useEffect(() => {
    loadGameState();
    const timer = setTimeout(() => setShowPodium(true), 500);
    return () => {
      clearTimeout(timer);
    };
  }, [loadGameState]);

  useEffect(() => {
    if (!showPodium) return;
    playCue('podium');
  }, [showPodium]);

  const finishedPlayers = players.filter(player => hasReachedFinishLine(player.position, finishLine));
  const podiumSize = Math.max(1, Math.min(3, players.length));
  const podiumReady = game?.phase === 'finished' || finishedPlayers.length >= podiumSize;

  const orderedFinishers = sortFinishers(finishedPlayers, answers);
  const sortedPlayers = [
    ...orderedFinishers,
    ...players
      .filter(player => player.position < finishLine)
      .sort((a, b) => b.position - a.position),
  ];
  const podium = orderedFinishers.slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Checkered Flag Pattern */}
      <div className="absolute top-0 left-0 right-0 h-4 bg-[repeating-linear-gradient(90deg,#000_0px,#000_20px,#fff_20px,#fff_40px)]"></div>
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-[repeating-linear-gradient(90deg,#fff_0px,#fff_20px,#000_20px,#000_40px)]"></div>

      <div className="max-w-2xl w-full text-center relative z-10">
        <div className="mb-5 flex justify-center">
          <F1Semaphore status={podiumReady ? 'finished' : 'running'} />
        </div>
        <div className={`transition-all duration-1000 ${showPodium ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="mb-6">
            <span className="text-8xl">🏆</span>
          </div>
          
          <h2 className="text-5xl font-black mb-2">
            <span className="text-yellow-400">PODIO</span>
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            {podiumReady ? 'Resultados finais da corrida' : 'Aguardando a formação do pódio'}
          </p>
        </div>

        {!podiumReady && (
          <div className="mb-6 rounded-xl border border-yellow-500/40 bg-yellow-900/20 p-5">
            <p className="text-lg font-bold text-yellow-300">
              {orderedFinishers[0]?.team_name
                ? `${orderedFinishers[0].team_name} está em 1º lugar. `
                : ''}
              O pódio será gerado quando mais {podiumSize - finishedPlayers.length} equipe
              {podiumSize - finishedPlayers.length === 1 ? '' : 's'} cruzar
              {podiumSize - finishedPlayers.length === 1 ? '' : 'em'} a linha de chegada.
            </p>
          </div>
        )}

        {/* F1 Style Podium */}
        {podiumReady && <PodiumArrival podium={podium} showPodium={showPodium} />}

        {/* Full Classification */}
        {podiumReady && <div className={`transition-all duration-1000 delay-700 ${showPodium ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Classificação Final</h3>
            <div className="space-y-2">
              {sortedPlayers.map((p, i) => (
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
        }

        {podiumReady && <button
          onClick={() => setViewState('start')}
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3 px-8 rounded-xl text-lg transition-all"
        >
          🏁 Nova Partida
        </button>}
      </div>
    </div>
  );
}
