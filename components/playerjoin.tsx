import { FormEvent, useState } from 'react';
import { useGameStore } from '../store/GameStore';

export function PlayerJoin() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const { joinGame, setViewState } = useGameStore();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (normalized.length !== 6) {
      setError('Digite o código de 6 caracteres.');
      return;
    }
    setError('');
    const joined = await joinGame(normalized);
    if (!joined) {
      setError('Partida não encontrada ou já iniciada. Confira o código ou escolha uma sala que ainda esteja aguardando jogadores.');
      return;
    }
    setViewState('player_setup');
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md text-center">
        <span className="inline-block rounded-lg bg-red-600 px-4 py-2 text-3xl font-black">F1</span>
        <h2 className="mt-6 text-3xl font-bold text-white">Entrar na partida</h2>
        <p className="mb-6 mt-2 text-lg text-gray-300">Digite o código compartilhado pelo administrador.</p>
        <input value={code} onChange={(e) => { setCode(e.target.value.replace(/[^a-z0-9]/gi, '').slice(0, 6)); setError(''); }} autoFocus aria-label="Código da partida" placeholder="ABC123" className="mb-3 w-full rounded-xl border border-gray-600 bg-gray-800 px-4 py-4 text-center font-mono text-3xl font-bold uppercase tracking-[0.3em] text-white outline-none focus:border-red-500" />
        {error && <p className="mb-4 text-base text-red-400">{error}</p>}
        <button type="submit" className="w-full rounded-xl bg-red-600 px-8 py-4 text-xl font-bold text-white transition hover:bg-red-500">Continuar</button>
        <button type="button" onClick={() => setViewState('start')} className="mt-4 text-base text-gray-300 hover:text-white">Voltar</button>
      </form>
    </main>
  );
}
