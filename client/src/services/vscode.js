import { initialize as initializeMonacoService } from '@codingame/monaco-vscode-api'
import getExtensionServiceOverride from '@codingame/monaco-vscode-extensions-service-override'

// Add standard language packages from monaco-editor (these will now map to codingame)
import '@codingame/monaco-vscode-theme-defaults-default-extension'
import '@codingame/monaco-vscode-javascript-default-extension'
import '@codingame/monaco-vscode-typescript-basics-default-extension'
import '@codingame/monaco-vscode-python-default-extension'

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'

let initialized = false

export async function initVSCode() {
  if (initialized) return
  initialized = true

  // Standard editor environment
  window.MonacoEnvironment = {
    getWorker: function (moduleId, label) {
      return new editorWorker()
    }
  }

  // Initialize service overrides and the internal extension host
  await initializeMonacoService({
    ...getExtensionServiceOverride({
      // Provide worker config for language extensions 
      workerConfig: {
        url: new URL('@codingame/monaco-vscode-api/workers/extensionHost.worker', import.meta.url).href,
        options: { type: 'module' }
      }
    })
  })
}
