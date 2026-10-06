import { useState } from 'react';
import { useGameStore } from '../store/GameStore';
import { assetPath } from '../lib/assetPath';

const RACE_LENGTHS = [
  { value: null, label: 'Todas as perguntas', hint: 'a corrida inteira, como sempre' },
  { value: 20, label: '20 perguntas', hint: 'uma sessão mais curta' },
  { value: 10, label: '10 perguntas', hint: 'uma rodada rápida' },
] as const;

export function StartScreen() {
  const { createGame, setViewState } = useGameStore();
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [raceLength, setRaceLength] = useState<number | null>(null);

  const handleCreateGame = async () => {
    if (isCreating) return;
    setIsCreating(true);
    setCreateError('');
    try {
      await createGame(raceLength);
    } catch (error) {
      console.error('Unable to create a game:', error);
      const databaseError = error as { code?: string };
      setCreateError(
        databaseError.code === '42703' || databaseError.code === '42P01'
          ? 'O banco de dados precisa ser inicializado. Execute o docker-compose e tente novamente.'
          : 'Não foi possível criar a partida. Verifique a conexão com o servidor e tente novamente.',
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#1a1a2e] p-6">
      <img
        src={assetPath('/start-grid-background.png')}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full scale-105 object-cover opacity-90 blur-sm"
      />
      <div className="absolute inset-0 -z-10 bg-[#101322]/75" />
      <div className="w-full max-w-4xl rounded-3xl border border-white/10 bg-[#1a1a2e]/45 p-10 text-center shadow-2xl backdrop-blur-md sm:p-16">
        <div className="mb-8">
          <span className="inline-block bg-red-600 px-5 py-2 rounded-xl shadow-lg shadow-red-900/40">
            <span className="text-6xl font-black tracking-tight sm:text-7xl">F1</span>
          </span>
          <h1 className="mt-6 text-4xl font-black text-white sm:text-6xl">Grande Prêmio da Ética</h1>
          <p className="mt-4 text-lg text-gray-300 sm:text-2xl">Uma corrida de decisões, responsabilidade e integridade.</p>
        </div>
        <div className="mb-5">
          <p className="text-sm font-bold uppercase tracking-wider text-gray-300">Comprimento da corrida</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {RACE_LENGTHS.map((choice) => (
              <button
                key={choice.label}
                type="button"
                onClick={() => setRaceLength(choice.value)}
                aria-pressed={raceLength === choice.value}
                className={`rounded-xl border-2 px-4 py-3 text-left transition ${
                  raceLength === choice.value
                    ? 'border-red-500 bg-red-600/20'
                    : 'border-gray-600 bg-gray-800/60 hover:border-gray-400'
                }`}
              >
                <span className="block font-bold text-white">{choice.label}</span>
                <span className="block text-sm text-gray-300">{choice.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <button onClick={() => void handleCreateGame()} disabled={isCreating} className="rounded-xl bg-red-600 px-8 py-6 text-xl font-bold text-white transition hover:bg-red-500 disabled:cursor-wait disabled:opacity-70 sm:text-2xl">
            {isCreating ? 'Criando partida...' : 'Criar partida'}
            <span className="mt-2 block text-base font-normal text-red-100 sm:text-lg">Você será o administrador</span>
          </button>
          <button onClick={() => setViewState('player_join')} className="rounded-xl border border-gray-600 bg-gray-800 px-8 py-6 text-xl font-bold text-white transition hover:border-gray-400 hover:bg-gray-700 sm:text-2xl">
            Entrar na partida
            <span className="mt-2 block text-base font-normal text-gray-300 sm:text-lg">Tenho um código</span>
          </button>
        </div>
        {createError && <p role="alert" className="mt-5 text-base text-red-300">{createError}</p>}
      </div>
    </main>
  );
}
