import { useEffect, useMemo } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { F1Car } from './F1Car';

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

interface TrackPosition {
  x: number;
  y: number;
  rotation: number;
}

const TRACK_ANIMATION_STEPS = 32;

interface TrackPoint {
  x: number;
  y: number;
}

function sampleCurve(start: TrackPoint, control1: TrackPoint, control2: TrackPoint, end: TrackPoint) {
  const steps = 24;

  return Array.from({ length: steps }, (_, index) => {
    const progress = (index + 1) / steps;
    const inverseProgress = 1 - progress;

    return {
      x:
        inverseProgress ** 3 * start.x +
        3 * inverseProgress ** 2 * progress * control1.x +
        3 * inverseProgress * progress ** 2 * control2.x +
        progress ** 3 * end.x,
      y:
        inverseProgress ** 3 * start.y +
        3 * inverseProgress ** 2 * progress * control1.y +
        3 * inverseProgress * progress ** 2 * control2.y +
        progress ** 3 * end.y,
    };
  });
}

const TRACK_PATH: TrackPoint[] = [
  { x: 100, y: 100 },
  { x: 920, y: 100 },
  ...sampleCurve(
    { x: 920, y: 100 },
    { x: 970, y: 100 },
    { x: 990, y: 125 },
    { x: 990, y: 165 },
  ),
  { x: 990, y: 185 },
  ...sampleCurve(
    { x: 990, y: 185 },
    { x: 990, y: 230 },
    { x: 970, y: 250 },
    { x: 920, y: 250 },
  ),
  { x: 180, y: 250 },
  ...sampleCurve(
    { x: 180, y: 250 },
    { x: 130, y: 250 },
    { x: 110, y: 275 },
    { x: 110, y: 315 },
  ),
  { x: 110, y: 325 },
  ...sampleCurve(
    { x: 110, y: 325 },
    { x: 110, y: 360 },
    { x: 135, y: 380 },
    { x: 180, y: 380 },
  ),
  { x: 980, y: 380 },
];

function getTrackPositions(finishLine: number): TrackPosition[] {
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
    const xPercent = (x / 1100) * 100;
    const yPercent = (y / 440) * 100;

    return {
      x: xPercent,
      y: yPercent,
      rotation:
        (Math.atan2(segmentEnd.y - segmentStart.y, segmentEnd.x - segmentStart.x) * 180) /
          Math.PI +
        270,
    };
  });
}

function interpolateTrackPosition(track: TrackPosition[], progress: number) {
  const sample = Math.max(0, Math.min(track.length - 1, progress * TRACK_ANIMATION_STEPS));
  const start = track[Math.floor(sample)];
  const end = track[Math.min(track.length - 1, Math.ceil(sample))];
  const amount = sample - Math.floor(sample);

  return {
    x: start.x + (end.x - start.x) * amount,
    y: start.y + (end.y - start.y) * amount,
    rotation: start.rotation + (end.rotation - start.rotation) * amount,
  };
}

interface TrackCarProps {
  player: CircuitBoardPlayer;
  position: number;
  track: TrackPosition[];
  laneOffset: number;
  sideOffset: number;
  rowOffset: number;
  isStartingGrid: boolean;
}

function TrackCar({
  player,
  position,
  track,
  laneOffset,
  sideOffset,
  rowOffset,
  isStartingGrid,
}: TrackCarProps) {
  const progress = useMotionValue(position);
  const lanePosition = useMotionValue(isStartingGrid ? 0 : laneOffset);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const distance = Math.abs(position - progress.get());
    if (distance === 0) return;

    const animation = animate(progress, position, {
      duration: reduceMotion ? 0 : Math.max(0.8, distance * 0.42),
      ease: 'linear',
    });
    return () => animation.stop();
  }, [position, progress, reduceMotion]);

  useEffect(() => {
    const animation = animate(lanePosition, isStartingGrid ? 0 : laneOffset, {
      duration: reduceMotion ? 0 : 0.5,
      ease: 'easeInOut',
    });
    return () => animation.stop();
  }, [isStartingGrid, laneOffset, lanePosition, reduceMotion]);

  const left = useTransform(() => {
    const point = interpolateTrackPosition(track, progress.get());
    const tangent = ((point.rotation - 270) * Math.PI) / 180;
    const normalX = -Math.sin(tangent);
    const offset = (normalX * lanePosition.get() * 100) / 1100;
    return `calc(${point.x}% + ${offset}%)`;
  });
  const top = useTransform(() => {
    const point = interpolateTrackPosition(track, progress.get());
    const tangent = ((point.rotation - 270) * Math.PI) / 180;
    const normalY = Math.cos(tangent);
    const offset = (normalY * lanePosition.get() * 100) / 440;
    return `calc(${point.y}% + ${offset}%)`;
  });
  const rotation = useTransform(progress, (value) => interpolateTrackPosition(track, value).rotation);

  return (
    <motion.div
      className="absolute z-30"
      style={{ left, top }}
      title={`${player.team_name} — ${player.f1_team}, casa ${position}`}
      aria-label={`${player.team_name}, ${player.f1_team}, casa ${position}`}
    >
      <div className="-translate-x-1/2 -translate-y-1/2">
        <motion.div style={{ rotate: rotation }}>
          <div
            className="flex text-[48px] sm:text-[60px] xl:text-[76px]"
            style={{
              transform: `translate(${sideOffset}em, ${rowOffset}em)`,
              transition: reduceMotion ? 'none' : 'transform 500ms ease-in-out',
            }}
          >
            <F1Car team={player.f1_team} className="h-[1em] w-[1em]" rotation={0} />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export function CircuitBoard({ players, finishLine, compact }: CircuitBoardProps) {
  const animationTrack = useMemo(
    () => getTrackPositions(finishLine * TRACK_ANIMATION_STEPS),
    [finishLine],
  );
  const playersAtPosition = new Map<number, CircuitBoardPlayer[]>();

  for (const player of players) {
    const group = playersAtPosition.get(player.position) ?? [];
    group.push(player);
    playersAtPosition.set(player.position, group);
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-600 shadow-xl">
      <div className={`relative isolate min-w-[720px] overflow-hidden bg-[#10251f] ${compact ? 'h-[190px]' : 'aspect-[5/2]'}`}>
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
            d="M0 100H920C970 100 990 125 990 165V185C990 230 970 250 920 250H180C130 250 110 275 110 315V325C110 360 135 380 180 380H1100"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="78"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M0 100H920C970 100 990 125 990 165V185C990 230 970 250 920 250H180C130 250 110 275 110 315V325C110 360 135 380 180 380H1100"
            fill="none"
            stroke="#343b46"
            strokeWidth="68"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M0 100H920C970 100 990 125 990 165V185C990 230 970 250 920 250H180C130 250 110 275 110 315V325C110 360 135 380 180 380H1100"
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

        {players.map((player) => {
          const position = Math.max(0, Math.min(finishLine, player.position));
          const group = playersAtPosition.get(player.position) ?? [player];
          const slot = group.findIndex((groupPlayer) => groupPlayer.id === player.id);
          const isStartingGrid = position === 0;
          const columns = isStartingGrid ? 4 : 2;
          const row = Math.floor(slot / columns);
          const rowCount = Math.ceil(group.length / columns);
          const carsInRow = Math.min(columns, group.length - row * columns);
          const sideOffset =
            isStartingGrid
              ? ((slot % columns) - (carsInRow - 1) / 2) * 0.2
              : 0;
          const rowOffset = isStartingGrid
            ? (row - (rowCount - 1) / 2) * 0.52
            : -row * 1.1;

          return (
            <TrackCar
              key={player.id}
              player={player}
              position={position}
              track={animationTrack}
              laneOffset={isStartingGrid || carsInRow === 1 ? 0 : slot % 2 === 0 ? -17 : 17}
              sideOffset={sideOffset}
              rowOffset={rowOffset}
              isStartingGrid={isStartingGrid}
            />
          );
        })}
      </div>
    </div>
  );
}
