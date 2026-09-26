import { useEffect } from 'react';
import { useGameStore } from '../store/GameStore';
import { TEAM_COLORS } from '../data/questions';
import { TeamLogo } from './TeamLogo';
import { StartingGrid } from './StartingGrid';

export function AdminWaiting() {
  const { game, players, startGame, setViewState, loadGameState } = useGameStore();

  useEffect(() => {
    loadGameState();
    const interval = setInterval(loadGameState, 2000);
    return () => clearInterval(interval);
  }, [loadGameState]);

  const handleStart = async () => {
    if (players.length < 1) {
      alert('Aguarde pelo menos 1 jogador entrar!');
      return;
    }
    await startGame();
    setViewState('admin_playing');
  };

  return (
    <div className="min-h-screen p-4 bg-[#1a1a2e]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="inline-block bg-red-600 px-3 py-1 rounded text-sm font-bold">F1</span>
            <h2 className="text-xl font-bold">Sala de Espera</h2>
          </div>
          <div className="text-gray-400 text-sm">
            Código: <span className="text-red-400 font-mono font-bold text-lg">{game?.game_code}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Board Preview */}
          <div className="bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 border-2 border-gray-700 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🏁</span>
              <h3 className="text-lg font-black uppercase tracking-wider text-white">Grid de Largada</h3>
            </div>
            
            <StartingGrid players={players} />
          </div>

          {/* Players List */}
          <div className="space-y-4">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">
                👥 Equipes Conectadas ({players.length})
              </h3>
              
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-3 bg-gray-700/50 rounded-xl p-4 border border-gray-600/30"
                  >
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                      style={{ backgroundColor: TEAM_COLORS[player.f1_team] || '#666' }}
                    >
                      <TeamLogo team={player.f1_team} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate">{player.team_name}</p>
                      <p className="text-gray-400 text-sm">{player.f1_team}</p>
                    </div>
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse flex-shrink-0"></div>
                  </div>
                ))}
              </div>
              
              {players.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm mb-2">Aguardando jogadores...</p>
                  <p className="text-gray-600 text-xs">Compartilhe o código: <span className="text-white font-mono font-bold">{game?.game_code}</span></p>
                </div>
              )}
            </div>

            <button
              onClick={handleStart}
              disabled={players.length < 1}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-xl text-xl transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100"
            >
              🏁 Iniciar Corrida ({players.length} jogador(es))
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}