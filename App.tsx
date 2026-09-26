import { useEffect } from 'react';
import { useGameStore } from './store/GameStore';
import { AdminGameCode } from './components/AdminGameCode';
import { AdminWaiting } from './components/AdminWaiting';
import { AdminPlaying } from './components/AdminPlaying';
import { AdminFinished } from './components/Admimfinished';
import { PlayerJoin } from './components/playerjoin';
import { PlayerSetup } from './components/player_setup';
import { PlayerWaiting } from './components/playerwaiting';
import { PlayerPlaying } from './components/player_playing';
import { PlayerFinished } from './components/PlayerFinished';
import { StartScreen } from './components/start_screen';

export default function App() {
  const { viewState, game, subscribeToGame } = useGameStore();

  useEffect(() => {
    if (!game) return;
    return subscribeToGame();
  }, [game?.id, subscribeToGame]);

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
