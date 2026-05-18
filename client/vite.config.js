import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import sri from 'vite-plugin-sri-gen'

export default defineConfig({
  plugins: [
    react(),
    sri({
      skipResources: [
        'https://fonts.googleapis.com/*',
        'https://fonts.gstatic.com/*'
      ]
    })
  ],
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
    chunkSizeWarningLimit: 1000
  }
})
