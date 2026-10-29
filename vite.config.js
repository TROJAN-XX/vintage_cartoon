import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // NOTE (flaw fix F5): match on path segments, not substrings.
            // The old `id.includes('react')` also matched `lucide-react`,
            // so `vendor-icons` was never emitted. Check lucide first,
            // then react/react-dom/scheduler, then a generic fallback.
            if (
              id.includes('node_modules/lucide-react') ||
              id.includes('node_modules\\lucide-react')
            ) {
              return 'vendor-icons';
            }
            if (
              id.includes('node_modules/react') ||
              id.includes('node_modules\\react') ||
              id.includes('node_modules/scheduler') ||
              id.includes('node_modules\\scheduler')
            ) {
              return 'vendor-react';
            }
            return 'vendor-libs';
          }
        }
      }
    },
    chunkSizeWarningLimit: 800,
    cssCodeSplit: true
  }
})
