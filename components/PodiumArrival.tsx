import { useEffect, useState } from 'react';
import { TEAM_COLORS } from '../lib/teams';
import type { PlayerRow } from '../lib/database.types';
import { TeamLogo } from './TeamLogo';

// Third place lands first, then second, then first; the winner is the last to
// settle. ARRIVAL_ORDER maps a place to the step (1..3) at which it appears.
const ARRIVAL_STEP_MS = 500;
const ARRIVAL_ORDER: Record<number, number> = { 1: 3, 2: 2, 3: 1 };

export function PodiumArrival({ podium, showPodium }: { podium: PlayerRow[]; showPodium: boolean }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!showPodium) return;
    const timers = [1, 2, 3].map((s) => window.setTimeout(() => setStep(s), s * ARRIVAL_STEP_MS));
    return () => { timers.forEach(window.clearTimeout); };
  }, [showPodium]);

  const arrived = (place: number) => step >= ARRIVAL_ORDER[place];
  const arrivalClass = (place: number) => arrived(place) ? 'podium-arrival-in' : 'podium-arrival';

  return (
    <div className={`transition-all duration-1000 delay-500 ${showPodium ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 border-2 border-gray-700 rounded-2xl p-8 mb-6">
        <h3 className="text-xl font-black mb-6 uppercase tracking-wider">
          <span className="text-yellow-400">PÓDIO</span> F1
        </h3>
        <div className="flex min-h-[360px] items-end justify-center gap-2 pt-8 sm:gap-4">
          {/* P2 */}
          {podium[1] && (
            <div className={`flex flex-col items-center ${arrivalClass(2)}`}>
              <div className="w-20 h-20 rounded-full mb-2 flex items-center justify-center text-3xl border-4 border-gray-400"
                style={{ backgroundColor: TEAM_COLORS[podium[1].f1_team] }}>
                <TeamLogo team={podium[1].f1_team} />
              </div>
              <p className="font-bold text-sm truncate max-w-[100px] mb-1">{podium[1].team_name}</p>
              <p className="text-gray-400 text-xs mb-2">{podium[1].f1_team}</p>
              <div className="w-24 h-28 bg-gradient-to-b from-gray-300 to-gray-500 rounded-t-xl flex items-center justify-center relative">
                <span className="text-5xl font-black text-white">2</span>
                <div className="absolute top-2 text-gray-600 text-xs font-bold">P2</div>
              </div>
            </div>
          )}

          {/* P1 */}
          {podium[0] && (
            <div className={`flex flex-col items-center ${arrivalClass(1)}`}>
              <div className="w-24 h-24 rounded-full mb-2 flex items-center justify-center text-4xl border-4 border-yellow-400 shadow-lg shadow-yellow-400/30"
                style={{ backgroundColor: TEAM_COLORS[podium[0].f1_team] }}>
                <TeamLogo team={podium[0].f1_team} />
              </div>
              <p className="font-bold text-sm truncate max-w-[120px] mb-1">{podium[0].team_name}</p>
              <p className="text-gray-400 text-xs mb-2">{podium[0].f1_team}</p>
              <div className="w-28 h-36 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-t-xl flex items-center justify-center relative">
                <span className="text-6xl font-black text-white">1</span>
                <div className="absolute top-2 text-yellow-800 text-xs font-bold">P1</div>
                <div className="absolute -top-4 text-3xl">👑</div>
              </div>
            </div>
          )}

          {/* P3 */}
          {podium[2] && (
            <div className={`flex flex-col items-center ${arrivalClass(3)}`}>
              <div className="w-20 h-20 rounded-full mb-2 flex items-center justify-center text-3xl border-4 border-orange-400"
                style={{ backgroundColor: TEAM_COLORS[podium[2].f1_team] }}>
                <TeamLogo team={podium[2].f1_team} />
              </div>
              <p className="font-bold text-sm truncate max-w-[100px] mb-1">{podium[2].team_name}</p>
              <p className="text-gray-400 text-xs mb-2">{podium[2].f1_team}</p>
              <div className="w-24 h-20 bg-gradient-to-b from-orange-400 to-orange-600 rounded-t-xl flex items-center justify-center relative">
                <span className="text-5xl font-black text-white">3</span>
                <div className="absolute top-2 text-orange-800 text-xs font-bold">P3</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}