import { TEAM_CAR_LIVERIES } from '../lib/teamCarLiveries';

interface F1CarProps {
  team: string;
  className?: string;
  rotation?: number;
  imageScale?: number;
}

export function F1Car({ team, className = 'h-8 w-8', rotation = 90, imageScale = 1 }: F1CarProps) {
  const image = TEAM_CAR_LIVERIES[team]?.image;

  return (
    <span
      role="img"
      aria-label={`Carro de F1 da equipe ${team}`}
      className={`relative inline-flex shrink-0 items-center justify-center drop-shadow-md ${className}`}
    >
      {image && (
        <img
          src={image}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain"
          style={{ transform: `rotate(${rotation}deg) scale(${imageScale})` }}
        />
      )}
    </span>
  );
}
