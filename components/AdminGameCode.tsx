import { useGameStore } from '../store/GameStore';
import { clearSeat } from '../lib/seat';

export function AdminGameCode() {
  const { game, setViewState } = useGameStore();

  const handleContinue = () => {
    setViewState('admin_waiting');
  };

  const handleBackToStart = () => {
    clearSeat();
    setViewState('start');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className="inline-block bg-red-600 px-4 py-2 rounded-lg mb-4">
            <span className="text-3xl font-black">F1</span>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold mb-2 text-white">Código da Partida</h2>
        <p className="text-gray-400 mb-6">Compartilhe este código com os jogadores</p>
        
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-red-500/50 rounded-2xl p-8 mb-6">
          <p className="text-gray-400 mb-2 text-sm uppercase tracking-wider">Código</p>
          <div className="text-6xl font-black tracking-[0.3em] text-red-400 font-mono">
            {game?.game_code}
          </div>
        </div>

        <p className="text-gray-500 text-sm mb-8">
          Os jogadores devem digitar este código para entrar na partida
        </p>

        <button
          onClick={handleContinue}
          className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-4 px-8 rounded-xl text-xl transition-all duration-300 transform hover:scale-105"
        >
          Continuar →
        </button>
        <button
          onClick={handleBackToStart}
          className="mt-4 w-full rounded-xl border border-gray-600 px-8 py-3 font-semibold text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
        >
          Voltar à tela inicial
        </button>
      </div>
    </div>
  );
}
