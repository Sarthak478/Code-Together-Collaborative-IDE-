import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import monacoEditorPluginModule from 'vite-plugin-monaco-editor'
import sri from '@small-tech/vite-plugin-sri'

const monacoEditorPlugin = monacoEditorPluginModule.default || monacoEditorPluginModule;

export default defineConfig({
  plugins: [
    react(),
    monacoEditorPlugin({
      languageWorkers: ['editorWorkerService', 'typescript', 'json']
    }),
    sri()
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