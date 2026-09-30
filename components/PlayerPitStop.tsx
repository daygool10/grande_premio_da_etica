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
        <div className={`relative mt-10 w-full max-w-[340px] ${launching ? 'pit-stop-launch' : 'pit-stop-car'}`}>
          <div className="absolute left-[8%] top-1/2 h-1 w-[84%] -translate-y-1/2 bg-white/10" />
          <F1Car team={f1Team} className="relative z-10 h-auto w-full drop-shadow-2xl" />
          <div className="pit-stop-tire pit-stop-tire-front-left" aria-hidden="true">
            <PitStopTire />
          </div>
          <div className="pit-stop-tire pit-stop-tire-front-right" aria-hidden="true">
            <PitStopTire />
          </div>
          <div className="pit-stop-tire pit-stop-tire-rear-left" aria-hidden="true">
            <PitStopTire />
          </div>
          <div className="pit-stop-tire pit-stop-tire-rear-right" aria-hidden="true">
            <PitStopTire />
          </div>
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

function PitStopTire() {
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="#111318" stroke="#ef3340" strokeWidth="2.5" />
      <circle cx="20" cy="20" r="11" fill="#303640" stroke="#d1d5db" strokeWidth="2" />
      <circle cx="20" cy="20" r="4" fill="#111318" />
      <path d="M20 9v7m0 8v7m-11-11h7m8 0h7M12 12l5 5m6 6 5 5m0-16-5 5m-6 6-5 5" stroke="#aeb5c0" strokeWidth="1.5" />
    </svg>
  );
}