import { useEffect, useState } from 'react';
import { F1Car } from './F1Car';
import { F1Semaphore } from './F1Semaphore';

interface StartingGridPlayer {
  id: string;
  team_name: string;
  f1_team: string;
}

interface StartingGridProps {
  players: StartingGridPlayer[];
}

const GRID_SIZE = 11;

export function StartingGrid({ players }: StartingGridProps) {
  const [entryOrder, setEntryOrder] = useState<string[]>([]);

  useEffect(() => {
    setEntryOrder((currentOrder) => {
      const activeIds = new Set(players.map((player) => player.id));
      const retainedIds = currentOrder.filter((id) => activeIds.has(id));
      const knownIds = new Set(retainedIds);
      const newIds = players
        .map((player) => player.id)
        .filter((id) => !knownIds.has(id));

      return newIds.length > 0 || retainedIds.length !== currentOrder.length
        ? [...retainedIds, ...newIds]
        : currentOrder;
    });
  }, [players]);

  const playersById = new Map(players.map((player) => [player.id, player]));
  const orderedPlayers = [
    ...entryOrder.map((id) => playersById.get(id)).filter((player) => player !== undefined),
    ...players.filter((player) => !entryOrder.includes(player.id)),
  ];

  return (
    <div className="relative isolate overflow-hidden rounded-2xl border border-gray-600 bg-[#303640] p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l-2 border-dashed border-white/20" />
      <div className="pointer-events-none absolute left-4 right-4 top-1/2 border-t border-white/10" />

      <div className="relative mb-4 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-black uppercase tracking-widest text-white">Grid de largada</h4>
          <p className="mt-1 text-xs text-gray-300">As vagas são preenchidas conforme as duplas entram.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="shrink-0 rounded-full border border-white/20 bg-black/30 px-3 py-1 text-xs font-bold text-gray-100">
            {Math.min(orderedPlayers.length, GRID_SIZE)}/{GRID_SIZE}
          </span>
          <F1Semaphore status="waiting" />
        </div>
      </div>

      <div className="relative grid grid-cols-2 gap-x-5 gap-y-3">
        {Array.from({ length: GRID_SIZE }, (_, index) => {
          const player = orderedPlayers[index];
          const position = index + 1;
          const isSecondColumn = index % 2 === 1;

          return (
            <div
              key={position}
              className={`flex min-h-[72px] min-w-0 items-center gap-2 rounded-lg border px-2 py-2 transition-all duration-500 sm:gap-3 sm:px-3 ${
                player
                  ? 'border-white/25 bg-gray-900/80 shadow-lg'
                  : 'border-dashed border-white/15 bg-black/10'
              } ${isSecondColumn ? 'translate-y-3' : ''}`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded font-black ${
                player ? 'bg-white text-gray-900' : 'bg-gray-700 text-gray-300'
              }`}>
                {position}
              </span>
              {player ? (
                <>
                  <F1Car team={player.f1_team} className="h-7 w-12 shrink-0 sm:h-8 sm:w-14" />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-white sm:text-sm">{player.team_name}</span>
                    <span className="block truncate text-[10px] text-gray-300 sm:text-xs">{player.f1_team}</span>
                  </span>
                </>
              ) : (
                <span className="truncate text-xs text-gray-400">Vaga disponível</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
