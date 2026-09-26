import { useState } from 'react';
import { TEAM_LOGOS } from '../lib/teamLogos';

interface TeamLogoProps {
  team: string;
  className?: string;
}

export function TeamLogo({ team, className = 'h-full w-full object-contain p-1' }: TeamLogoProps) {
  const [hasLoadError, setHasLoadError] = useState(false);
  const logo = TEAM_LOGOS[team];

  if (!logo || hasLoadError) {
    const initials = team.split(/\s+/).map((part) => part[0]).join('').slice(0, 3);
    return <span aria-label={team} title={team} className="font-black">{initials}</span>;
  }

  return (
    <img
      src={logo}
      alt={`${team} logo`}
      className={className}
      onError={() => setHasLoadError(true)}
    />
  );
}
