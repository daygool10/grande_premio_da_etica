import { F1Car } from './F1Car';

interface PlayerPitStopProps {
  teamName: string;
  f1Team: string;
  launching?: boolean;
  resultMessage?: string;
}

export function PlayerPitStop({ teamName, f1Team, launching = false, resultMessage }: PlayerPitStopProps) {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#1a1a2e] p-4">
      <img
        src="/player-question-background.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full scale-105 object-cover opacity-90 blur-sm"
      />
      <div className="absolute inset-0 -z-10 bg-[#101322]/75" />
      <section className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center" role="status" aria-live="polite">
        <p className="text-2xl font-black text-white sm:text-3xl">
          {launching ? 'Voltando para a pista!' : 'Pit stop'}
        </p>
        <p className="mt-2 text-base text-gray-300 sm:text-lg">
          {launching
            ? `${teamName}, próxima parada: a nova pergunta!`
            : `${teamName}, a equipe está trocando os pneus.`}
        </p>
        <div className={`relative mt-10 aspect-square w-full max-w-[min(76vw,340px)] ${launching ? 'pit-stop-launch' : 'pit-stop-car'}`}>
          <F1Car team={f1Team} className="h-full w-full drop-shadow-2xl" rotation={270} />
        </div>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-red-300">
          {launching ? 'Acelerando...' : 'Trocando para pneus novos'}
        </p>
        {resultMessage && (
          <p className="mt-5 rounded-xl border border-white/10 bg-gray-900/70 px-5 py-3 text-lg font-bold text-white">
            {resultMessage}
          </p>
        )}
        {!launching && (
          <p className="mt-3 animate-pulse text-gray-400">Aguardando a próxima pergunta...</p>
        )}
      </section>
    </main>
  );
}
