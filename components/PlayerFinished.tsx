import { useEffect, useState } from 'react';
import { useGameStore } from '../store/GameStore';
import { boardScale } from '../data/questions';
import { RaceResults } from './RaceResults';

export function PlayerFinished() {
  const { game, players, currentPlayer, answers, loadGameState, loadClassification, classification, returnToHome, dealtQuestions } = useGameStore();
  const [showConfetti, setShowConfetti] = useState(true);
  const [showPodium, setShowPodium] = useState(false);
  const [showReturnButton, setShowReturnButton] = useState(false);
  const boardSize = boardScale(dealtQuestions.length);

  useEffect(() => {
    loadGameState();
    loadClassification();

    const timer = setTimeout(() => setShowPodium(true), 2000);
    
    return () => {
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
  const podiumReady = game?.phase === 'finished';
  const sortedPlayers = classification
    .map((entry) => playersWithCurrent.find((player) => player.id === entry.player_id))
    .filter((player): player is typeof playersWithCurrent[number] => Boolean(player));
  const latestAnswer = currentPlayer
    ? answers.filter((answer) => answer.player_id === currentPlayer.id).sort((a, b) => b.question_index - a.question_index)[0]
    : undefined;

  useEffect(() => {
    if (!podiumReady || !showPodium) return;
    const timer = setTimeout(() => setShowReturnButton(true), 1500);
    return () => clearTimeout(timer);
  }, [podiumReady, showPodium]);

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
              FIM DA CORRIDA
            </span>
          </h2>
          <p className="text-gray-400 mb-4 text-lg">
            {`A corrida terminou. ${currentPlayer?.team_name ?? 'Sua equipe'} avançou ${currentPlayer?.position ?? 0} de ${boardSize} casas.`}
            {latestAnswer?.response_time_ms !== null && latestAnswer?.response_time_ms !== undefined && ` Tempo da última resposta: ${latestAnswer.response_time_ms} ms.`}
          </p>
          
          <div className={`transition-all duration-1000 ${showPodium ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <RaceResults
              players={sortedPlayers}
              boardSize={boardSize}
              highlightedPlayerId={currentPlayer?.id}
              showPodium={podiumReady}
            />
          </div>

          {podiumReady && showReturnButton && (
            <button
              onClick={returnToHome}
              className="mt-6 w-full rounded-lg bg-red-600 px-6 py-4 text-lg font-black text-white shadow-lg transition-colors hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto sm:text-xl"
            >
              Participar de uma nova corrida
            </button>
          )}
        </div>

        {/* F1 Style Podium */}
        {!podiumReady && (
          <div className="mb-6 rounded-xl border border-yellow-500/40 bg-yellow-900/20 p-5">
            <p className="text-lg font-bold text-yellow-300">
              Aguardando o encerramento da corrida para exibir os resultados finais.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
