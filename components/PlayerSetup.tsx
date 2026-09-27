import { useEffect, useState } from 'react';
import { useGameStore } from '../store/GameStore';
import { F1_TEAMS, TEAM_COLORS } from '../lib/teams';
import { TeamLogo } from './TeamLogo';

export function PlayerSetup() {
  const [teamName, setTeamName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setupPlayer, players, loadGameState } = useGameStore();

  const takenTeams = new Set(players.map(p => p.f1_team));

  useEffect(() => {
    loadGameState()
      .catch((loadError: unknown) => {
        console.error('Error loading teams for player setup:', loadError);
        setError('Não foi possível carregar as equipes. Atualize a página e tente novamente.');
      })
      .finally(() => setIsLoadingPlayers(false));
  }, [loadGameState]);

  const handleSetup = async () => {
    if (!teamName.trim()) {
      setError('Digite o nome da sua dupla!');
      return;
    }
    if (!selectedTeam) {
      setError('Selecione uma equipe F1!');
      return;
    }
    if (takenTeams.has(selectedTeam)) {
      setError('Esta equipe já foi escolhida! Escolha outra.');
      setSelectedTeam(null);
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const result = await setupPlayer(teamName.trim(), selectedTeam);
      if (result === 'team_taken') {
        setSelectedTeam(null);
        setError('Outra dupla acabou de escolher esta equipe. Selecione outra.');
      } else if (result === 'error') {
        setError('Não foi possível entrar na partida. Tente novamente.');
      }
    } catch (setupError: unknown) {
      console.error('Error setting up player:', setupError);
      setError('Não foi possível entrar na partida. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-6">
          <span className="inline-block bg-red-600 px-4 py-2 rounded-lg">
            <span className="text-3xl font-black">F1</span>
          </span>
        </div>
        
        <h2 className="text-2xl font-bold mb-2 text-center">Configurar Equipe</h2>
        <p className="text-gray-400 mb-6 text-center">Escolha o nome da dupla e sua equipe F1</p>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
          <label className="text-gray-400 text-sm mb-2 block">Nome da Dupla</label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => {
              setTeamName(e.target.value);
              setError('');
            }}
            placeholder="Ex: Pilotos da Velocidade"
            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
          <label className="text-gray-400 text-sm mb-3 block">
            Equipe F1
            {isLoadingPlayers && <span className="ml-2">Carregando equipes disponíveis...</span>}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {F1_TEAMS.map((team) => {
              const isTaken = takenTeams.has(team);
              return (
                <button
                  key={team}
                  type="button"
                  onClick={() => {
                    if (!isTaken && !isLoadingPlayers && !isSubmitting) {
                      setSelectedTeam(team);
                      setError('');
                    }
                  }}
                  disabled={isTaken || isLoadingPlayers || isSubmitting}
                  className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 disabled:cursor-not-allowed ${
                    isTaken
                      ? 'border-gray-600 bg-gray-800/30 opacity-40 cursor-not-allowed'
                      : selectedTeam === team
                      ? 'border-white bg-gray-700'
                      : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                  }`}
                >
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                    style={{ backgroundColor: TEAM_COLORS[team] }}
                  >
                    <TeamLogo team={team} />
                  </div>
                  <span className="font-bold text-sm truncate">{team}</span>
                  {isTaken && <span className="text-xs text-red-400 ml-auto">Já escolhida</span>}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
        )}

        <button
          onClick={handleSetup}
          disabled={isLoadingPlayers || isSubmitting}
          className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-700 disabled:hover:scale-100 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-xl text-xl transition-all duration-300 transform hover:scale-105"
        >
          {isSubmitting ? 'Entrando...' : '🏎️ Entrar na Corrida'}
        </button>
      </div>
    </div>
  );
}
