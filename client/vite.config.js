import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const monacoEditorPlugin = require('vite-plugin-monaco-editor')

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    monacoEditorPlugin({
      languageWorkers: ['editorWorkerService', 'typescript', 'json', 'css', 'html']
    })
  ]
})
