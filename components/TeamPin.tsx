import { TEAM_COLORS } from '../data/questions';

interface TeamPinProps {
  team: string;
  className?: string;
}

export function TeamPin({ team, className = '' }: TeamPinProps) {
  const color = TEAM_COLORS[team] ?? '#d1d5db';
  const initials = team
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <span
      role="img"
      aria-label={`Marcador da equipe ${team}`}
      title={team}
      className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white text-[9px] font-black text-white shadow-[0_2px_7px_rgba(0,0,0,0.9)] ring-1 ring-black/80 ${className}`}
      style={{
        backgroundColor: color,
        boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.45), 0 2px 7px rgba(0,0,0,0.9)',
        textShadow: '0 1px 2px rgba(0,0,0,0.95)',
      }}
    >
      {initials}
      <span
        aria-hidden="true"
        className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-white"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}
