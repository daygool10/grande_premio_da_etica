import { useGameStore } from '../store/GameStore';

export function StartScreen() {
  const { createGame, setViewState } = useGameStore();

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#1a1a2e] p-6">
      <img
        src="/start-grid-background.png"
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
        <div className="grid gap-5 sm:grid-cols-2">
          <button onClick={createGame} className="rounded-xl bg-red-600 px-8 py-6 text-xl font-bold text-white transition hover:bg-red-500 sm:text-2xl">
            Criar partida
            <span className="mt-2 block text-base font-normal text-red-100 sm:text-lg">Você será o administrador</span>
          </button>
          <button onClick={() => setViewState('player_join')} className="rounded-xl border border-gray-600 bg-gray-800 px-8 py-6 text-xl font-bold text-white transition hover:border-gray-400 hover:bg-gray-700 sm:text-2xl">
            Entrar na partida
            <span className="mt-2 block text-base font-normal text-gray-300 sm:text-lg">Tenho um código</span>
          </button>
        </div>
      </div>
    </main>
  );
}
