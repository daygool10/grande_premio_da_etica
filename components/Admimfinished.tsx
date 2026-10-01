import { useEffect, useState } from 'react';
import { useGameStore } from '../store/GameStore';
import { sortFinishers } from '../lib/finishOrder';
import { F1Semaphore } from './F1Semaphore';
import { getBoardSize, questions } from '../data/questions';
import { RaceResults } from './RaceResults';

export function AdminFinished() {
  const { game, players, answers, loadGameState, returnToHome } = useGameStore();
  const [showPodium, setShowPodium] = useState(false);
  const [showReturnButton, setShowReturnButton] = useState(false);
  const boardSize = getBoardSize(game?.question_order?.length ?? questions.length);

  useEffect(() => {
    loadGameState();
    const interval = setInterval(loadGameState, 3000);
    const timer = setTimeout(() => setShowPodium(true), 500);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [loadGameState]);

  const finishedPlayers = players.filter(player => player.position >= boardSize);
  const podiumSize = Math.max(1, Math.min(3, players.length));
  const podiumReady = game?.phase === 'finished' || finishedPlayers.length >= podiumSize;

  const orderedFinishers = sortFinishers(finishedPlayers, answers);
  const sortedPlayers = [
    ...orderedFinishers,
    ...players
      .filter(player => player.position < boardSize)
      .sort((a, b) => b.position - a.position),
  ];
  const podium = orderedFinishers.slice(0, 3);

  useEffect(() => {
    if (!podiumReady || !showPodium) return;
    const timer = setTimeout(() => setShowReturnButton(true), 1500);
    return () => clearTimeout(timer);
  }, [podiumReady, showPodium]);

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

        <div className={`transition-all duration-1000 ${showPodium ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <RaceResults players={sortedPlayers} boardSize={boardSize} showPodium={podiumReady} />
        </div>

        {podiumReady && showReturnButton && (
          <button
            onClick={returnToHome}
            className="mt-6 rounded-lg bg-red-600 px-6 py-4 text-lg font-black text-white shadow-lg transition-colors hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:text-xl"
          >
            Participar de uma nova corrida
          </button>
        )}
      </div>
    </div>
  );
}
