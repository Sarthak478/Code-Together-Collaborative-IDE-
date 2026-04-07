import { initialize as initializeMonacoService } from '@codingame/monaco-vscode-api'
import getExtensionServiceOverride from '@codingame/monaco-vscode-extensions-service-override'

// Add standard language packages from monaco-editor (these will now map to codingame)
import '@codingame/monaco-vscode-theme-defaults-default-extension'
import '@codingame/monaco-vscode-javascript-default-extension'
import '@codingame/monaco-vscode-typescript-basics-default-extension'
import '@codingame/monaco-vscode-python-default-extension'

let initialized = false

export async function initVSCode() {
  if (initialized) return
  initialized = true

  // Standard editor environment
  window.MonacoEnvironment = {
    getWorker: function (moduleId, label) {
      if (label === 'editorWorkerService') {
        return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url), { type: 'module' })
      }
      return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url), { type: 'module' })
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
