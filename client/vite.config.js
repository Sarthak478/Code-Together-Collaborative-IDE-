import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('monaco-editor') || id.includes('@codingame')) {
              return 'monaco';
            }
            if (id.includes('react') || id.includes('framer-motion') || id.includes('lucide-react')) {
              return 'vendor';
            }
          }
        }
      }
    },
    chunkSizeWarningLimit: 10000
  }
})
