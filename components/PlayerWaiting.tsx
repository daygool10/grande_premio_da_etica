import { useEffect, useState } from 'react';
import { useGameStore } from '../store/GameStore';

type StartSequence = 'waiting' | 'tire-exit' | 'lights-red' | 'lights-green';

export function PlayerWaiting() {
  const { game, currentPlayer, players, loadGameState, setViewState } = useGameStore();
  const [startSequence, setStartSequence] = useState<StartSequence>('waiting');

  useEffect(() => {
    loadGameState();
    const interval = window.setInterval(loadGameState, 2000);
    return () => window.clearInterval(interval);
  }, [loadGameState]);

  useEffect(() => {
    if (game?.phase === 'finished') {
      setViewState('player_finished');
      return;
    }

    if (game?.phase !== 'question' || startSequence !== 'waiting') return;

    setStartSequence('tire-exit');
  }, [game?.phase, startSequence, setViewState]);

  useEffect(() => {
    if (startSequence === 'waiting') return;

    const nextStage: Record<Exclude<StartSequence, 'waiting' | 'lights-green'>, StartSequence> = {
      'tire-exit': 'lights-red',
      'lights-red': 'lights-green',
    };
    const delay = startSequence === 'tire-exit' ? 950 : startSequence === 'lights-red' ? 850 : 750;

    const timer = window.setTimeout(() => {
      if (startSequence === 'lights-green') {
        setViewState('player_playing');
      } else {
        setStartSequence(nextStage[startSequence]);
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [startSequence, setViewState]);

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden p-4">
      <img
        src="/waiting-background.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full scale-105 object-cover opacity-90 blur-sm"
      />
      <div className="absolute inset-0 -z-10 bg-[#101322]/75" />
      {startSequence === 'waiting' ? (
        <div className="relative z-10 w-full max-w-xl text-center">
          <span className="inline-block rounded-lg bg-red-600 px-4 py-2 text-4xl font-black">F1</span>
          <h2 className="mt-6 text-4xl font-black sm:text-5xl">Aguardando a largada</h2>
          <p className="mt-3 text-lg text-gray-300 sm:text-xl">Olá, <strong className="text-white">{currentPlayer?.team_name}</strong>! O administrador iniciará a corrida em breve.</p>
          <div className="my-6 flex flex-col items-center gap-2">
            <svg
              viewBox="0 0 120 120"
              role="img"
              aria-label="Pneu soft de Fórmula 1 girando"
              className="waiting-soft-tire h-28 w-28 drop-shadow-2xl sm:h-32 sm:w-32"
            >
              <circle cx="60" cy="60" r="53" fill="#111318" stroke="#343942" strokeWidth="4" />
              <circle cx="60" cy="60" r="45" fill="none" stroke="#ef3340" strokeWidth="5" />
              <circle cx="60" cy="60" r="37" fill="#20242c" stroke="#090b10" strokeWidth="5" />
              <circle cx="60" cy="60" r="27" fill="#aeb5c0" stroke="#171a20" strokeWidth="4" />
              <circle cx="60" cy="60" r="20" fill="#343a44" stroke="#d1d5db" strokeWidth="2" />
              <circle cx="60" cy="60" r="8" fill="#111318" stroke="#9ca3af" strokeWidth="3" />
              <g stroke="#252a33" strokeWidth="5" strokeLinecap="round">
                <path d="M60 34v17M60 69v17M34 60h17M69 60h17M42 42l12 12M66 66l12 12M78 42 66 54M54 66 42 78" />
              </g>
              <path d="M17 39a48 48 0 0 1 15-20" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-300">Pneu SOFT aquecendo</p>
          </div>
          <div className="rounded-2xl border border-gray-700 bg-gray-800/70 p-6 backdrop-blur-sm">
            <p className="text-base uppercase tracking-wider text-gray-300 sm:text-lg">Código da partida</p>
            <p className="mt-2 font-mono text-5xl font-black tracking-widest text-red-400">{game?.game_code}</p>
            <p className="mt-6 text-lg text-gray-300">{players.length} equipe(s) conectada(s)</p>
            <div className="mx-auto mt-5 h-2 w-48 overflow-hidden rounded-full bg-gray-700"><div className="h-full w-1/2 animate-pulse rounded-full bg-red-500" /></div>
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col items-center gap-6 text-center" role="status" aria-live="polite">
          {startSequence === 'tire-exit' ? (
            <>
              <svg
                viewBox="0 0 120 120"
                aria-hidden="true"
                className="waiting-soft-tire waiting-soft-tire-exit h-32 w-32 drop-shadow-2xl"
              >
                <circle cx="60" cy="60" r="53" fill="#111318" stroke="#343942" strokeWidth="4" />
                <circle cx="60" cy="60" r="45" fill="none" stroke="#ef3340" strokeWidth="5" />
                <circle cx="60" cy="60" r="37" fill="#20242c" stroke="#090b10" strokeWidth="5" />
                <circle cx="60" cy="60" r="27" fill="#aeb5c0" stroke="#171a20" strokeWidth="4" />
                <circle cx="60" cy="60" r="20" fill="#343a44" stroke="#d1d5db" strokeWidth="2" />
                <circle cx="60" cy="60" r="8" fill="#111318" stroke="#9ca3af" strokeWidth="3" />
                <g stroke="#252a33" strokeWidth="5" strokeLinecap="round">
                  <path d="M60 34v17M60 69v17M34 60h17M69 60h17M42 42l12 12M66 66l12 12M78 42 66 54M54 66 42 78" />
                </g>
              </svg>
              <p className="text-2xl font-black uppercase tracking-wider text-white">Largando!</p>
            </>
          ) : (
            <>
              <div
                className="flex flex-col gap-3 rounded-2xl border-4 border-gray-600 bg-[#17191f] p-4 shadow-2xl"
                aria-label={startSequence === 'lights-red' ? 'Semáforo vermelho' : 'Semáforo verde'}
              >
                <span className={`h-12 w-12 rounded-full transition-all duration-300 ${
                  startSequence === 'lights-red'
                    ? 'bg-red-500 shadow-[0_0_24px_8px_rgba(239,68,68,0.8)]'
                    : 'bg-red-950'
                }`} />
                <span className="h-12 w-12 rounded-full bg-yellow-950" />
                <span className={`h-12 w-12 rounded-full transition-all duration-300 ${
                  startSequence === 'lights-green'
                    ? 'bg-green-500 shadow-[0_0_24px_8px_rgba(34,197,94,0.8)]'
                    : 'bg-green-950'
                }`} />
              </div>
              <p className="text-2xl font-black uppercase tracking-wider text-white">
                {startSequence === 'lights-red' ? 'Atenção...' : 'Acelerar!'}
              </p>
            </>
          )}
        </div>
      )}
    </main>
  );
}
