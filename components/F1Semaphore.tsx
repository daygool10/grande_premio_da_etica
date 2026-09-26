export type RaceStatus = 'waiting' | 'running' | 'finished';

interface F1SemaphoreProps {
  status: RaceStatus;
}

const lightColors = {
  red: {
    active: 'bg-red-500 shadow-[0_0_12px_4px_rgba(239,68,68,0.85)]',
    inactive: 'bg-red-950',
  },
  yellow: {
    active: 'bg-yellow-400 shadow-[0_0_12px_4px_rgba(250,204,21,0.85)]',
    inactive: 'bg-yellow-950',
  },
  green: {
    active: 'bg-green-500 shadow-[0_0_12px_4px_rgba(34,197,94,0.85)]',
    inactive: 'bg-green-950',
  },
};

export function F1Semaphore({ status }: F1SemaphoreProps) {
  const activeLight = status === 'waiting' ? 'red' : status === 'running' ? 'green' : null;
  const label = status === 'waiting'
    ? 'Aguardando largada'
    : status === 'running'
      ? 'Corrida em andamento'
      : 'Pódio completo';

  return (
    <div className="flex items-center gap-2" role="status" aria-label={label}>
      <div className="flex items-center gap-1.5 rounded-full border border-gray-600 bg-[#111318] px-2 py-1.5 shadow-inner">
        {(Object.keys(lightColors) as Array<keyof typeof lightColors>).map((light) => (
          <span
            key={light}
            aria-hidden="true"
            className={`h-3 w-3 rounded-full transition-all duration-300 ${
              activeLight === light ? lightColors[light].active : lightColors[light].inactive
            }`}
          />
        ))}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wide text-gray-300 sm:text-xs">
        {label}
      </span>
    </div>
  );
}
