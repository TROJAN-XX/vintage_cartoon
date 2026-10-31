import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vitest config (pendingworks.md P3-6). Kept separate from vite.config.js so the
// production manualChunks/build settings stay untouched (minimal diff). jsdom
// provides a DOM for component + storage tests; no real media/network is used.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    css: false,
    // Windows sandbox: the default `forks`/`threads` pools can fail to spawn
    // workers (process-creation overhead). `vmThreads` runs tests in an
    // in-process vm context, which is reliable locally and in CI.
    pool: 'vmThreads',
    // Run files sequentially — one worker at a time (avoids worker-spawn races).
    fileParallelism: false,
  },
});
