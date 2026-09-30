import type { QuestionDelta, OvertakeReport } from '../lib/debrief';

interface PlayerScoreFlashProps {
  delta: QuestionDelta | null;
  overtake: OvertakeReport | null;
}

export function PlayerScoreFlash({ delta, overtake }: PlayerScoreFlashProps) {
  if (!delta) return null;

  const gained = delta.delta > 0;
  const lost = delta.delta < 0;
  const amount = Math.abs(delta.delta);
  const plural = amount === 1 ? '' : 's';

  const figure = gained ? `+${delta.delta}` : lost ? `-${amount}` : '±0';
  const figureColor = gained ? 'text-green-400' : lost ? 'text-red-400' : 'text-gray-300';

  const pointsLabel = gained
    ? `${amount} ponto${plural} a mais na corrida`
    : lost
      ? `${amount} ponto${plural} a menos na corrida`
      : 'Nenhum ponto nesta volta';

  const isFastest = delta.speedRank === 1;
  const passed = (overtake?.passedNames.length ?? 0) > 0;
  const overtaken = (overtake?.passedByName.length ?? 0) > 0;

  return (
    <div className="absolute top-2 left-2 z-20 max-w-[calc(100%-1rem)] rounded-xl border border-gray-600 bg-[#10151c]/95 p-3 shadow-2xl backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <span
          className={`min-w-[3rem] rounded-lg py-1 text-center text-3xl font-black ${
            gained ? 'bg-green-900/40' : lost ? 'bg-red-900/40' : 'bg-gray-800'
          } ${figureColor}`}
        >
          {figure}
        </span>
        <div className="min-w-0">
          {isFastest && (
            <p className="text-xs font-black uppercase tracking-wide text-yellow-400">
              ⚡ Mais rápido!
            </p>
          )}
          <p className="truncate text-sm font-bold text-gray-200">{pointsLabel}</p>
        </div>
      </div>

      {(passed || overtaken) && (
        <div className="mt-2 space-y-1 border-t border-gray-700 pt-2 text-xs">
          {passed && (
            <p className="text-green-300">
              <span className="font-bold">Passou:</span>{' '}
              <span className="font-semibold">{overtake!.passedNames.join(', ')}</span>
            </p>
          )}
          {overtaken && (
            <p className="text-red-300">
              <span className="font-bold">Ultrapassado por:</span>{' '}
              <span className="font-semibold">{overtake!.passedByName.join(', ')}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}