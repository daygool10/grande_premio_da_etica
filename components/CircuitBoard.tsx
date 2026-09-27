import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { TeamPin } from './TeamPin';

interface CircuitBoardPlayer {
  id: string;
  team_name: string;
  f1_team: string;
  position: number;
}

interface CircuitBoardProps {
  players: CircuitBoardPlayer[];
  finishLine: number;
  highlightPlayerId?: string;
  compact?: boolean;
}

const CAR_OFFSET_PX = 18;

interface PlacedCar {
  player: CircuitBoardPlayer;
  left: string;
  top: string;
  isHighlighted: boolean;
}

const TRACK_PATH =
  'M120 100H920C970 100 990 125 990 165V185C990 230 970 250 920 250H180C130 250 110 275 110 315V325C110 360 135 380 180 380H980';

function tangentAt(path: SVGPathElement, pathLength: number, fraction: number): { x: number; y: number } {
  const near = path.getPointAtLength(Math.max(0, fraction - 0.001) * pathLength);
  const far = path.getPointAtLength(Math.min(1, fraction + 0.001) * pathLength);
  return { x: far.x - near.x, y: far.y - near.y };
}

export function CircuitBoard({ players, finishLine, highlightPlayerId, compact }: CircuitBoardProps) {
  const trackRef = useRef<SVGPathElement | null>(null);
  const [pathLength, setPathLength] = useState(0);

  useLayoutEffect(() => {
    const path = trackRef.current;
    if (path) setPathLength(path.getTotalLength());
  }, []);

  const carPositions = useMemo<PlacedCar[]>(() => {
    const path = trackRef.current;
    if (!path || finishLine <= 0 || pathLength <= 0) {
      return [];
    }

    const grouped = new Map<number, CircuitBoardPlayer[]>();
    for (const player of players) {
      const fraction = Math.min(1, Math.max(0, player.position / finishLine));
      const bucket = grouped.get(fraction) ?? [];
      bucket.push(player);
      grouped.set(fraction, bucket);
    }

    const placed: PlacedCar[] = [];
    for (const [fraction, bucket] of grouped) {
      const point = path.getPointAtLength(fraction * pathLength);
      const tangent = tangentAt(path, pathLength, fraction);
      const tangentLength = Math.hypot(tangent.x, tangent.y);
      const normal =
        tangentLength === 0
          ? { x: 0, y: 1 }
          : { x: -tangent.y / tangentLength, y: tangent.x / tangentLength };

      bucket.forEach((player, index) => {
        const lateral = (index - (bucket.length - 1) / 2) * CAR_OFFSET_PX;
        const x = (point.x + normal.x * lateral) / 1100;
        const y = (point.y + normal.y * lateral) / 440;
        placed.push({
          player,
          left: `${x * 100}%`,
          top: `${y * 100}%`,
          isHighlighted: player.id === highlightPlayerId,
        });
      });
    }
    return placed;
  }, [players, finishLine, pathLength, highlightPlayerId]);

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-600 shadow-xl">
      <div className={`relative isolate overflow-hidden bg-[#10251f] min-w-[720px] sm:h-[440px] ${compact ? 'h-[190px]' : 'h-[380px]'}`}>
        <svg
          viewBox="0 0 1100 440"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
        >
          <defs>
            <pattern id="circuit-checkers" width="12" height="12" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="#f9fafb" />
              <rect x="6" y="6" width="6" height="6" fill="#f9fafb" />
            </pattern>
          </defs>
          <rect width="1100" height="440" fill="#15352b" />
          <path
            ref={trackRef}
            d={TRACK_PATH}
            fill="none"
            stroke="#d1d5db"
            strokeWidth="78"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={TRACK_PATH}
            fill="none"
            stroke="#343b46"
            strokeWidth="68"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={TRACK_PATH}
            fill="none"
            stroke="#9ca3af"
            strokeWidth="2"
            strokeDasharray="12 12"
            opacity=".65"
          />
          <path d="M200 60v80" stroke="url(#circuit-checkers)" strokeWidth="10" />
          <path d="M980 340v80" stroke="url(#circuit-checkers)" strokeWidth="10" />
          <rect x="340" y="294" width="400" height="48" rx="24" fill="#194133" stroke="#275643" strokeWidth="2" />
          <text x="540" y="324" textAnchor="middle" fill="#82a995" fontSize="15" fontWeight="700" letterSpacing="4">
            ETICA GRAND PRIX
          </text>
        </svg>

        {carPositions.map(({ player, left, top, isHighlighted }) => (
          <div
            key={player.id}
            className={`absolute z-10 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center ${
              isHighlighted
                ? 'rounded-full ring-2 ring-yellow-300 shadow-[0_0_10px_2px_rgba(253,224,71,0.6)]'
                : ''
            }`}
            style={{ left, top }}
            title={`${player.team_name} — ${player.f1_team}`}
          >
            <TeamPin team={player.f1_team} className="h-5 w-5 text-[7px]" />
            <span className="sr-only">{player.team_name} — {player.f1_team}</span>
          </div>
        ))}
      </div>
    </div>
  );
}