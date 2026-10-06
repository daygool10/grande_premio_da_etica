import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
  // Necessário para o GitHub Pages: o site fica em
  // https://daygool10.github.io/grande_premio_da_etica/
  base: '/grande_premio_da_etica/',
});
