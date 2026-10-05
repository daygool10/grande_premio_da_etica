import { useEffect, useState } from 'react';
import { useGameStore } from '../store/GameStore';
import { TEAM_COLORS } from '../data/questions';
import { TeamLogo } from './TeamLogo';
import { StartingGrid } from './StartingGrid';
import { assetPath } from '../lib/assetPath';

export function AdminWaiting() {
  const { game, players, startGame, setViewState, loadGameState, removeOfflinePlayer } = useGameStore();
  const [startError, setStartError] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [removingPlayerId, setRemovingPlayerId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState('');

  useEffect(() => {
    loadGameState();
    const interval = setInterval(loadGameState, 2000);
    return () => clearInterval(interval);
  }, [loadGameState]);

  const handleRemoveOfflinePlayer = async (playerId: string) => {
    if (removingPlayerId) return;
    setRemovingPlayerId(playerId);
    setRemoveError('');
    try {
      const removed = await removeOfflinePlayer(playerId);
      if (!removed) setRemoveError('A equipe voltou a se conectar ou não pôde ser removida. Atualize a lista e tente novamente.');
    } catch (error) {
      console.error('Error removing offline player from the waiting room:', error);
      setRemoveError('Não foi possível remover a equipe offline. Tente novamente.');
    } finally {
      setRemovingPlayerId(null);
    }
  };

  const handleStart = async () => {
    if (players.length < 1 || isStarting) return;
    setStartError('');
    setIsStarting(true);
    try {
      await startGame();
      setViewState('admin_playing');
    } catch (error) {
      console.error('Error starting the game:', error);
      setStartError('Não foi possível iniciar a corrida. Verifique a conexão e tente novamente.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-x-hidden bg-[#1a1a2e] p-4">
      <img
        src={assetPath('/waiting-background.png')}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full scale-105 object-cover opacity-90 blur-sm"
      />
      <div className="absolute inset-0 -z-10 bg-[#101322]/75" />
      <div className="relative z-10 mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="inline-block rounded bg-red-600 px-3 py-1 text-base font-bold">F1</span>
            <h2 className="text-2xl font-bold sm:text-3xl">Sala de Espera</h2>
          </div>
          <div className="text-base text-gray-300 sm:text-lg">
            Código: <span className="font-mono text-xl font-bold text-red-400 sm:text-2xl">{game?.game_code}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Board Preview */}
          <div className="bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 border-2 border-gray-700 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🏁</span>
              <h3 className="text-xl font-black uppercase tracking-wider text-white sm:text-2xl">Grid de Largada</h3>
            </div>
            
            <StartingGrid players={players} />
          </div>

          {/* Players List */}
          <div className="space-y-4">
            <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
              <h3 className="text-base font-bold text-gray-300 mb-4 uppercase tracking-wider">
                👥 Duplas na grade ({players.length})
              </h3>
              
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {players.map((player) => {
                  const isOffline = !player.last_seen ||
                    Date.now() - new Date(player.last_seen).getTime() > 90_000;
                  return (
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
                        <p className="font-bold text-lg text-white truncate">{player.team_name}</p>
                        <p className="text-gray-300 text-base">{player.f1_team}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${
                        isOffline ? 'bg-gray-600 text-gray-200' : 'bg-green-900/70 text-green-300'
                      }`}>
                        {isOffline ? 'Desconectada' : 'Conectada'}
                      </span>
                      {isOffline && (
                        <button
                          type="button"
                          onClick={() => void handleRemoveOfflinePlayer(player.id)}
                          disabled={game?.phase !== 'waiting' || removingPlayerId !== null}
                          className="rounded-lg border border-red-400/50 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Remover ${player.team_name} da grade`}
                        >
                          {removingPlayerId === player.id ? 'Removendo...' : 'Remover'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {removeError && <p role="alert" className="mt-3 text-sm text-red-300">{removeError}</p>}
              <p className="mt-3 text-xs text-gray-400">Uma dupla fica offline após 90 segundos sem heartbeat. Remoções só são permitidas antes da largada.</p>
              
              {players.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-300 text-base mb-2">Aguardando jogadores...</p>
                  <p className="text-gray-300 text-sm">Compartilhe o código: <span className="text-white font-mono font-bold">{game?.game_code}</span></p>
                </div>
              )}
            </div>

            <button
              onClick={handleStart}
              disabled={players.length < 1 || isStarting}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-xl text-2xl transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100"
            >
              {isStarting ? 'Iniciando...' : `🏁 Iniciar Corrida (${players.length} jogador(es))`}
            </button>
            {startError && <p role="alert" className="text-center text-sm text-red-300">{startError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}