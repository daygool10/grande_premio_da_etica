import { TeamPin } from './TeamPin';

interface CircuitBoardPlayer {
  id: string;
  team_name: string;
  f1_team: string;
  position: number;
}

interface CircuitBoardProps {
  players: CircuitBoardPlayer[];
  boardSize: number;
}

const TRACK_POSITIONS = [
  { left: '14%', top: '22%' },
  { left: '35%', top: '22%' },
  { left: '60%', top: '22%' },
  { left: '84%', top: '22%' },
  { left: '84%', top: '57%' },
  { left: '60%', top: '57%' },
  { left: '35%', top: '57%' },
  { left: '20%', top: '57%' },
  { left: '20%', top: '86%' },
  { left: '50%', top: '86%' },
  { left: '96%', top: '86%' },
];

export function CircuitBoard({ players, boardSize }: CircuitBoardProps) {
  const positions = Array.from({ length: boardSize + 1 }, (_, position) => {
    const point = TRACK_POSITIONS[position];
    if (!point) {
      throw new Error(`No circuit coordinate configured for board position ${position}`);
    }

    return { position, ...point };
  });

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-600 shadow-xl">
      <div className="relative isolate h-[380px] min-w-[720px] overflow-hidden bg-[#10251f] sm:h-[440px]">
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
