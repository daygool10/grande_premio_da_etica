import { useEffect, useState } from 'react';
import { useGameStore } from './store/GameStore';
import { AdminGameCode } from './components/AdminGameCode';
import { AdminWaiting } from './components/AdminWaiting';
import { AdminPlaying } from './components/AdminPlaying';
import { AdminFinished } from './components/AdminFinished';
import { PlayerJoin } from './components/PlayerJoin';
import { PlayerSetup } from './components/PlayerSetup';
import { PlayerWaiting } from './components/PlayerWaiting';
import { PlayerPlaying } from './components/PlayerPlaying';
import { PlayerFinished } from './components/PlayerFinished';
import { StartScreen } from './components/StartScreen';

const FALLBACK_POLL_MS = 10000;

export default function App() {
  const { viewState, game, subscribeToGame, loadGameState, restoreSeat } = useGameStore();
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    restoreSeat()
      .catch((error) => { console.error('Seat restore failed:', error); })
      .finally(() => setIsRestoring(false));
  }, [restoreSeat]);

  useEffect(() => {
    if (!game) return;
    return subscribeToGame();
  }, [game?.id, subscribeToGame]);

  // Realtime is the primary update path. This single slow poller is a safety net for
  // the case where the Realtime socket drops or the table is not published to Realtime:
  // without it a player would silently stop receiving new questions.
  useEffect(() => {
    if (!game?.id) return;
    loadGameState();
    const interval = setInterval(loadGameState, FALLBACK_POLL_MS);
    return () => clearInterval(interval);
  }, [game?.id, loadGameState]);

  if (isRestoring) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Carregando...</div>
      </div>
    );
  }

  switch (viewState) {
    case 'admin_game_code': return <AdminGameCode />;
    case 'admin_waiting': return <AdminWaiting />;
    case 'admin_playing': return <AdminPlaying />;
    case 'admin_finished': return <AdminFinished />;
    case 'player_join': return <PlayerJoin />;
    case 'player_setup': return <PlayerSetup />;
    case 'player_waiting': return <PlayerWaiting />;
    case 'player_playing': return <PlayerPlaying />;
    case 'player_finished': return <PlayerFinished />;
    case 'start':
    default: return <StartScreen />;
  }
}
