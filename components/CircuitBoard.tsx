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
  compact?: boolean;
}

const TRACK_PATH = [
  { x: 120, y: 100 },
  { x: 920, y: 100 },
  { x: 990, y: 165 },
  { x: 990, y: 185 },
  { x: 920, y: 250 },
  { x: 180, y: 250 },
  { x: 110, y: 315 },
  { x: 110, y: 325 },
  { x: 180, y: 380 },
  { x: 980, y: 380 },
  { x: 1056, y: 380 },
];

function getTrackPositions(finishLine: number) {
  const segmentLengths = TRACK_PATH.slice(1).map((point, index) => {
    const previous = TRACK_PATH[index];
    return Math.hypot(point.x - previous.x, point.y - previous.y);
  });
  const cumulativeLengths = [0];
  for (const length of segmentLengths) {
    cumulativeLengths.push(cumulativeLengths[cumulativeLengths.length - 1] + length);
  }

  const totalLength = cumulativeLengths[cumulativeLengths.length - 1];
  let segmentIndex = 0;

  return Array.from({ length: finishLine + 1 }, (_, position) => {
    const distance = (totalLength * position) / finishLine;
    while (
      segmentIndex < segmentLengths.length - 1 &&
      cumulativeLengths[segmentIndex + 1] < distance
    ) {
      segmentIndex += 1;
    }

    const segmentStart = TRACK_PATH[segmentIndex];
    const segmentEnd = TRACK_PATH[segmentIndex + 1];
    const segmentProgress =
      (distance - cumulativeLengths[segmentIndex]) / segmentLengths[segmentIndex];
    const x = segmentStart.x + (segmentEnd.x - segmentStart.x) * segmentProgress;
    const y = segmentStart.y + (segmentEnd.y - segmentStart.y) * segmentProgress;

    return {
      position,
      left: `${(x / 1100) * 100}%`,
      top: `${(y / 440) * 100}%`,
    };
  });
}

export function CircuitBoard({ players, finishLine, compact }: CircuitBoardProps) {
  const positions = getTrackPositions(finishLine);

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-600 shadow-xl">
      <div className={`relative isolate overflow-hidden bg-[#10251f] min-w-[720px] sm:h-[440px] ${compact ? 'h-[190px]' : 'h-[380px]'}`}>
        <svg
          viewBox="0 0 1100 440"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-0 z-0 h-full w-full"
        >
          <defs>
            <pattern id="circuit-checkers" width="12" height="12" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="#f9fafb" />
              <rect x="6" y="6" width="6" height="6" fill="#f9fafb" />
            </pattern>
          </defs>
          <rect width="1100" height="440" fill="#15352b" />
          <path
            d="M120 100H920C970 100 990 125 990 165V185C990 230 970 250 920 250H180C130 250 110 275 110 315V325C110 360 135 380 180 380H980"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="78"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M120 100H920C970 100 990 125 990 165V185C990 230 970 250 920 250H180C130 250 110 275 110 315V325C110 360 135 380 180 380H980"
            fill="none"
            stroke="#343b46"
            strokeWidth="68"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M120 100H920C970 100 990 125 990 165V185C990 230 970 250 920 250H180C130 250 110 275 110 315V325C110 360 135 380 180 380H980"
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

        <div
          className="absolute left-[11%] top-[22%] z-20 grid grid-cols-3 gap-0"
          aria-label="Carros alinhados atrás da linha de largada"
        >
          {players
            .filter((player) => player.position === 0)
            .map((player) => (
              <span
                key={player.id}
                className="flex h-6 w-6 items-center justify-center"
                title={`${player.team_name} — ${player.f1_team}`}
              >
                <TeamPin team={player.f1_team} className="h-5 w-5 text-[7px]" />
                <span className="sr-only">{player.team_name} — {player.f1_team}</span>
              </span>
            ))}
        </div>

        {positions.filter(({ position }) => position !== 0).map(({ position, left, top }) => {
          const teamsAtPosition = players.filter((player) => player.position === position);

          return (
            <div
              key={position}
              className="absolute z-30 flex w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              style={{ left, top }}
              title={
                teamsAtPosition.length > 0
                  ? teamsAtPosition.map((player) => `${player.team_name} (${player.f1_team})`).join(', ')
                  : `Casa ${position}`
              }
            >
              {teamsAtPosition.length > 0 && (
                <div className="grid w-full grid-cols-3 justify-items-center gap-0">
                  {teamsAtPosition.map((player) => (
                    <span
                      key={player.id}
                      className="flex h-6 w-6 items-center justify-center"
                      title={`${player.team_name} — ${player.f1_team}`}
                    >
                      <TeamPin team={player.f1_team} className="h-5 w-5 text-[7px]" />
                      <span className="sr-only">{player.team_name} — {player.f1_team}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

      </div>
    </div>
  );
}
