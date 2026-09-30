import { useState } from 'react';
import { F1Car } from './F1Car';
import { F1Semaphore } from './F1Semaphore';
import { TEAM_COUNT } from '../lib/teams';

interface StartingGridPlayer {
  id: string;
  team_name: string;
  f1_team: string;
}

interface StartingGridProps {
  players: StartingGridPlayer[];
}

export function StartingGrid({ players }: StartingGridProps) {
  const [entryOrder, setEntryOrder] = useState<string[]>([]);
  const [seenPlayerIds, setSeenPlayerIds] = useState<string[] | null>(null);

  const currentPlayerIds = players.map((player) => player.id);

  if (
    seenPlayerIds === null ||
    currentPlayerIds.some((id) => !seenPlayerIds.includes(id)) ||
    seenPlayerIds.some((id) => !currentPlayerIds.includes(id))
  ) {
    setSeenPlayerIds(currentPlayerIds);
    setEntryOrder((currentOrder) => {
      const activeIds = new Set(currentPlayerIds);
      const retainedIds = currentOrder.filter((id) => activeIds.has(id));
      const knownIds = new Set(retainedIds);
      const newIds = currentPlayerIds
        .filter((id) => !knownIds.has(id));

      return newIds.length > 0 || retainedIds.length !== currentOrder.length
        ? [...retainedIds, ...newIds]
        : currentOrder;
    });
  }

  const playersById = new Map(players.map((player) => [player.id, player]));
  const orderedPlayers = [
    ...entryOrder.map((id) => playersById.get(id)).filter((player) => player !== undefined),
    ...players.filter((player) => !entryOrder.includes(player.id)),
  ];

  return (
    <div className="relative isolate overflow-hidden rounded-2xl border border-gray-600 bg-[#303640] p-5 sm:p-7">
      <div className="relative mb-4 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-base font-black uppercase tracking-widest text-white sm:text-lg">Grid de largada</h4>
          <p className="mt-1 text-sm text-gray-300 sm:text-base">As vagas são preenchidas conforme as duplas entram.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="shrink-0 rounded-full border border-white/20 bg-black/30 px-3 py-1 text-sm font-bold text-gray-100">
            {Math.min(orderedPlayers.length, TEAM_COUNT)}/{TEAM_COUNT}
          </span>
          <F1Semaphore status="waiting" />
        </div>
      </div>

      <div className="relative grid grid-cols-2 gap-x-5 gap-y-4">
        {Array.from({ length: TEAM_COUNT }, (_, index) => {
          const player = orderedPlayers[index];
          const position = index + 1;
          const isSecondColumn = index % 2 === 1;

          return (
            <div
              key={position}
              className={`flex min-h-[88px] min-w-0 items-center gap-2 rounded-lg border px-2 py-2 transition-all duration-500 sm:gap-3 sm:px-3 ${
                player
                  ? 'border-white/25 bg-gray-900/80 shadow-lg'
                  : 'border-dashed border-white/15 bg-black/10'
              } ${isSecondColumn ? 'translate-y-3' : ''}`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded text-lg font-black ${
                player ? 'bg-white text-gray-900' : 'bg-gray-700 text-gray-300'
              }`}>
                {position}
              </span>
              {player ? (
                <>
                  <F1Car team={player.f1_team} className="h-10 w-16 shrink-0 sm:h-12 sm:w-20" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-white sm:text-base">{player.team_name}</span>
                    <span className="block truncate text-xs text-gray-300 sm:text-sm">{player.f1_team}</span>
                  </span>
                </>
              ) : (
                <span className="truncate text-sm text-gray-400 sm:text-base">Vaga disponível</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
