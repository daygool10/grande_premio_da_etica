import { TEAM_CAR_LIVERIES } from '../lib/teamCarLiveries';

interface F1CarProps {
  team: string;
  className?: string;
  rotation?: number;
}

export function F1Car({ team, className = 'h-8 w-14', rotation = 0 }: F1CarProps) {
  const livery = TEAM_CAR_LIVERIES[team] ?? {
    body: '#d1d5db',
    accent: '#111827',
    detail: '#f9fafb',
  };

  return (
    <svg
      viewBox="0 0 100 48"
      role="img"
      aria-label={`Carro de F1 da equipe ${team}`}
      className={`shrink-0 drop-shadow-md ${className}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <title>{`Carro de F1 da equipe ${team}`}</title>
      <g fill="#090b10">
        <rect x="22" y="3" width="16" height="11" rx="4" />
        <rect x="22" y="34" width="16" height="11" rx="4" />
        <rect x="67" y="3" width="15" height="11" rx="4" />
        <rect x="67" y="34" width="15" height="11" rx="4" />
        <path d="M7 13h13v22H7z" />
        <path d="M87 11h5v26h-5z" />
      </g>
      <path
        d="M13 18 30 17l12-5h23l13 6 15 4 5 2-5 2-15 4-13 6H42l-12-5-17-1-7-5v-7z"
        fill={livery.body}
        stroke="#e5e7eb"
        strokeOpacity=".55"
        strokeWidth="1"
      />
      <path d="M5 18h14v12H5zM88 13h8v22h-8z" fill={livery.accent} />
      <path d="M18 22h66v4H18z" fill={livery.detail} opacity=".95" />
      <path d="M37 17h29l8 7-8 7H37l-7-7z" fill={livery.accent} />
      <path d="M43 19h17l5 5-5 5H43l-4-5z" fill="#10151d" />
      <circle cx="52" cy="24" r="3" fill={livery.detail} />
      <path d="M82 20h9v8h-9z" fill={livery.body} />
    </svg>
  );
}
