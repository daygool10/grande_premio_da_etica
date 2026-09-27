import { useState } from 'react';
import { readSoundPreference, setSoundPreference, unlockAudio } from '../lib/sound';

export function SoundPrompt() {
  const [visible, setVisible] = useState(() => readSoundPreference() === 'unset');

  if (!visible) return null;

  const chooseYes = () => {
    unlockAudio();
    setSoundPreference('on');
    setVisible(false);
  };

  const chooseNo = () => {
    setSoundPreference('off');
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl border border-gray-600 bg-[#1a1a2e] p-8 text-center shadow-2xl">
        <h2 className="text-2xl font-black text-white">Ativar sons?</h2>
        <p className="mt-2 text-gray-400">Podemos tocar um som nos acertos e na chegada ao pódio.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={chooseYes}
            className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white transition hover:bg-red-500"
          >
            Sim, com sons
          </button>
          <button
            onClick={chooseNo}
            className="rounded-xl border border-gray-600 bg-gray-800 px-6 py-3 font-bold text-white transition hover:bg-gray-700"
          >
            Não, sem sons
          </button>
        </div>
      </div>
    </div>
  );
}