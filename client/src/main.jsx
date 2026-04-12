import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { initVSCode } from './services/vscode.js'

initVSCode().then(() => {
  createRoot(document.getElementById('root')).render(
    <App />
  )
})
