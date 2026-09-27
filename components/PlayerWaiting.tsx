import { useEffect } from 'react';
import { useGameStore } from '../store/GameStore';

export function PlayerWaiting() {
  const { game, currentPlayer, players, loadGameState, setViewState } = useGameStore();

  useEffect(() => {
    loadGameState();
  }, [loadGameState]);

  useEffect(() => {
    if (game?.phase === 'question') setViewState('player_playing');
    if (game?.phase === 'finished') setViewState('player_finished');
  }, [game?.phase, setViewState]);

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xl text-center">
        <span className="inline-block rounded-lg bg-red-600 px-4 py-2 text-3xl font-black">F1</span>
        <h2 className="mt-6 text-3xl font-black">Aguardando a largada</h2>
        <p className="mt-3 text-gray-400">Olá, <strong className="text-white">{currentPlayer?.team_name}</strong>! O administrador iniciará a corrida em breve.</p>
        <div className="mt-8 rounded-2xl border border-gray-700 bg-gray-800/60 p-6">
          <p className="text-sm uppercase tracking-wider text-gray-400">Código da partida</p>
          <p className="mt-2 font-mono text-4xl font-black tracking-widest text-red-400">{game?.game_code}</p>
          <p className="mt-6 text-gray-400">{players.length} equipe(s) conectada(s)</p>
          <div className="mx-auto mt-5 h-2 w-48 overflow-hidden rounded-full bg-gray-700"><div className="h-full w-1/2 animate-pulse rounded-full bg-red-500" /></div>
        </div>
      </div>
    </main>
  );
}
