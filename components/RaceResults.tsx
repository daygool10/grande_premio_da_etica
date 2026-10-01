import { TEAM_COLORS } from '../data/questions';
import { F1Car } from './F1Car';
import { TeamLogo } from './TeamLogo';

export interface RaceResultPlayer {
  id: string;
  team_name: string;
  f1_team: string;
  position: number;
}

interface RaceResultsProps {
  players: RaceResultPlayer[];
  boardSize: number;
  highlightedPlayerId?: string;
  showPodium: boolean;
}

const PODIUM_SLOTS = [
  { rank: 2, height: 'h-28', border: 'border-gray-400', label: 'text-gray-300' },
  { rank: 1, height: 'h-40', border: 'border-yellow-400', label: 'text-yellow-300' },
  { rank: 3, height: 'h-20', border: 'border-orange-400', label: 'text-orange-300' },
];

export function RaceResults({
  players,
  boardSize,
  highlightedPlayerId,
  showPodium,
}: RaceResultsProps) {
  const podium = players.slice(0, 3);

  return (
    <div className="mt-8 w-full space-y-6 text-left">
      {showPodium && podium.length > 0 && (
        <section aria-labelledby="race-podium-title" className="rounded-xl border border-yellow-500/30 bg-gray-900/80 p-4 sm:p-6">
          <h3 id="race-podium-title" className="mb-5 text-center text-xl font-black uppercase text-yellow-300 sm:text-2xl">
            Pódio final
          </h3>
          <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
            {PODIUM_SLOTS.map(({ rank, height, border, label }) => {
              const player = podium[rank - 1];
              if (!player) return <div key={rank} />;

              const winner = rank === 1;

              return (
                <div key={player.id} className="flex min-w-0 flex-col items-center text-center">
                  <span
                    className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-gray-800 sm:h-14 sm:w-14 ${border}`}
                    style={{ backgroundColor: `${TEAM_COLORS[player.f1_team] ?? '#374151'}33` }}
                  >
                    <TeamLogo team={player.f1_team} className="h-8 w-8 object-contain p-1 sm:h-11 sm:w-11" />
                  </span>
                  <F1Car
                    team={player.f1_team}
                    className={winner ? 'mb-1 h-10 w-16 sm:h-12 sm:w-20' : 'mb-1 h-9 w-14 sm:h-10 sm:w-16'}
                  />
                  <span className="w-full break-words text-xs font-black leading-tight text-white sm:text-base">
                    {player.team_name}
                  </span>
                  <span className="mt-1 mb-2 text-[10px] text-gray-300 sm:text-xs">{player.f1_team}</span>
                  <div className={`flex w-full max-w-40 flex-col items-center justify-center rounded-t-lg border-t-4 bg-gray-800/80 px-1 ${height} ${border}`}>
                    <span className={`text-2xl font-black sm:text-4xl ${label}`}>{rank}º</span>
                    <span className="text-[9px] font-bold uppercase text-gray-400 sm:text-xs">{winner ? 'Campeão' : 'Pódio'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {showPodium && (
        <section aria-labelledby="race-classification-title" className="rounded-xl border border-gray-700 bg-gray-900/80 p-4 sm:p-6">
          <h3 id="race-classification-title" className="mb-4 text-lg font-black uppercase text-gray-200 sm:text-xl">
            Classificação final
          </h3>
          <ol className="space-y-2">
            {players.map((player, index) => (
              <li
                key={player.id}
                className={`flex min-w-0 items-center gap-3 rounded-lg border px-3 py-2 sm:gap-4 sm:px-4 sm:py-3 ${
                  player.id === highlightedPlayerId
                    ? 'border-green-500/60 bg-green-900/30'
                    : 'border-white/5 bg-gray-800/70'
                }`}
              >
                <span className={`w-9 shrink-0 text-center text-lg font-black sm:w-12 sm:text-2xl ${index === 0 ? 'text-yellow-300' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-300' : 'text-gray-500'}`}>
                  {index + 1}º
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-700 sm:h-11 sm:w-11">
                  <TeamLogo team={player.f1_team} className="h-8 w-8 object-contain p-1 sm:h-10 sm:w-10" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-black leading-tight text-white sm:text-lg">{player.team_name}</span>
                  <span className="block truncate text-xs text-gray-400 sm:text-sm">{player.f1_team}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-gray-400 sm:text-sm">
                  {player.position}/{boardSize}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}