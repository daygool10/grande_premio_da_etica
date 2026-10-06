import { useState } from 'react';
import { useGameStore } from '../store/GameStore';

interface Limits {
  keepNewest: number;
  emptyLobbyMinutes: number;
  abandonedHours: number;
}

const DEFAULT_LIMITS: Limits = { keepNewest: 5, emptyLobbyMinutes: 60, abandonedHours: 24 };

export function AdminCleanup() {
  const { cleanupSummary, isCleaning, cleanupGames } = useGameStore();
  const [limits, setLimits] = useState<Limits>(DEFAULT_LIMITS);
  const [isOpen, setIsOpen] = useState(false);

  const update = (key: keyof Limits, raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    setLimits({ ...limits, [key]: Number.isFinite(parsed) ? parsed : 0 });
  };

  return (
    <section className="rounded-xl border border-gray-700 bg-gray-800/70 p-4">
      <div className="flex items-center gap-3">
        <h3 className="text-base font-bold uppercase tracking-wider text-gray-300">🧹 Partidas antigas</h3>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="ml-auto rounded-lg border border-gray-600 px-3 py-2 text-sm font-semibold text-gray-200 hover:border-gray-400"
        >
          {isOpen ? 'Fechar limpeza' : 'Limpar partidas'}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-gray-400">
            Apaga partidas que ninguém está usando: salas vazias antigas e corridas paradas. As mais
            recentes e esta partida ficam sempre.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-sm text-gray-300">
              Guardar as mais recentes
              <input
                type="number"
                min={1}
                value={limits.keepNewest}
                onChange={(event) => update('keepNewest', event.target.value)}
                aria-label="Quantas partidas recentes guardar"
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="text-sm text-gray-300">
              Sala vazia há (minutos)
              <input
                type="number"
                min={1}
                value={limits.emptyLobbyMinutes}
                onChange={(event) => update('emptyLobbyMinutes', event.target.value)}
                aria-label="Minutos para considerar a sala vazia abandonada"
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="text-sm text-gray-300">
              Sem atividade há (horas)
              <input
                type="number"
                min={1}
                value={limits.abandonedHours}
                onChange={(event) => update('abandonedHours', event.target.value)}
                aria-label="Horas para considerar a corrida abandonada"
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => void cleanupGames(limits.keepNewest, limits.emptyLobbyMinutes, limits.abandonedHours)}
            disabled={isCleaning}
            className="w-full rounded-lg bg-red-700 px-4 py-3 font-bold text-white hover:bg-red-600 disabled:opacity-60"
          >
            {isCleaning ? 'Limpando...' : 'Limpar partidas abandonadas'}
          </button>
          {cleanupSummary && <p role="status" className="text-sm text-green-300">{cleanupSummary}</p>}
        </div>
      )}
    </section>
  );
}
