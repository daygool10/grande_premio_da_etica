import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { youwareVitePlugin } from '@youware/vite-plugin-react';

export default defineConfig({
  plugins: [youwareVitePlugin(), react()],
  server: {
    // Players join from their phones, so the dev server has to listen on the
    // LAN. It also fixes localhost resolving to ::1 only, which leaves
    // 127.0.0.1 refused on this machine.
    host: true,
    // The project sits on a 9p WSL mount where inotify delivers no filesystem
    // events, so the default watcher never sees edits and Fast Refresh never
    // fires. Polling is required for Fast Refresh to work.
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
});