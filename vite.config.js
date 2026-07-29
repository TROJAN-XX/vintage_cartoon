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
            if (id.includes('react') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react') || id.includes('lucide')) {
              return 'vendor-icons';
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
