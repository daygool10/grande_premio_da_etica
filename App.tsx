import { useCallback, useEffect, useState } from 'react';
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
import { SoundPrompt } from './components/SoundPrompt';
import { StartScreen } from './components/StartScreen';

export default function App() {
  const {
    viewState, game, currentPlayer, subscribeToGame, checkPlayerRecovery,
    recoveryCandidate, isCheckingRecovery, recoveryError, resumePlayerSession,
    startFreshPlayerSession, heartbeatPlayer,
  } = useGameStore();
  const [isChangingIdentity, setIsChangingIdentity] = useState(false);

  useEffect(() => {
    void checkPlayerRecovery();
  }, [checkPlayerRecovery]);

  useEffect(() => {
    if (!game) return;
    return subscribeToGame();
  }, [game?.id, subscribeToGame]);

  useEffect(() => {
    if (!currentPlayer) return;
    const sendHeartbeat = () => void heartbeatPlayer(currentPlayer.id);
    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, 20_000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') sendHeartbeat();
    };
    window.addEventListener('focus', sendHeartbeat);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', sendHeartbeat);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [currentPlayer?.id, heartbeatPlayer]);

  const handleFreshIdentity = useCallback(async () => {
    setIsChangingIdentity(true);
    try {
      await startFreshPlayerSession();
    } finally {
      setIsChangingIdentity(false);
    }
  }, [startFreshPlayerSession]);

  if (isCheckingRecovery) {
    return <main className="flex min-h-screen items-center justify-center text-gray-300">Verificando partida salva...</main>;
  }

  if (recoveryCandidate) {
    const canChangeIdentity = game?.id === recoveryCandidate.gameId && game.phase === 'waiting';
    return (
      <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden p-4">
        <div className="absolute inset-0 -z-10 bg-[#101322]/90" />
        <section className="w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 p-7 text-center shadow-2xl">
          <span className="inline-block rounded-lg bg-red-600 px-4 py-2 text-3xl font-black">F1</span>
          <h1 className="mt-5 text-2xl font-bold text-white">Partida anterior encontrada</h1>
          <p className="mt-3 text-gray-300">
            {recoveryCandidate.teamName} · {recoveryCandidate.f1Team}<br />
            Código <strong className="font-mono text-red-300">{recoveryCandidate.gameCode}</strong>
          </p>
          <p className="mt-4 text-sm text-gray-400">
            {canChangeIdentity
              ? 'Retome sua dupla exatamente de onde parou ou remova-a da grade para configurar uma nova enquanto a sala aguarda a largada. Se a corrida começar antes da nova configuração, a sala recusará a entrada.'
              : 'A corrida já começou. Para preservar o andamento e a posição da equipe, só é possível retomar esta identidade.'}
          </p>
          {recoveryError && <p role="alert" className="mt-4 text-sm text-red-300">{recoveryError}</p>}
          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={() => void resumePlayerSession()}
              className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-500"
            >
              Retomar com esta dupla
            </button>
            {canChangeIdentity && (
              <button
                type="button"
                onClick={() => void handleFreshIdentity()}
                disabled={isChangingIdentity}
                className="rounded-xl border border-gray-600 px-5 py-3 font-semibold text-gray-200 hover:border-gray-400 disabled:opacity-60"
              >
                {isChangingIdentity ? 'Removendo equipe anterior...' : 'Voltar com outro nome/equipe'}
              </button>
            )}
          </div>
        </section>
      </main>
    );
  }

  if (recoveryError) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <section className="max-w-md text-center">
          <p role="alert" className="text-red-300">{recoveryError}</p>
          <button onClick={() => void checkPlayerRecovery()} className="mt-4 rounded-lg bg-gray-700 px-5 py-3 text-white">
            Tentar novamente
          </button>
        </section>
      </main>
    );
  }

  const view = (() => {
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
  })();

  return <>{view}<SoundPrompt /></>;
}
