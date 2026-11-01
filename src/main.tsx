import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './Design.css'
import { observeInstallPrompt } from './lib/install-prompt'

const stopInstallPrompt = observeInstallPrompt()
if (import.meta.env.PROD && 'serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(() => {})
if (import.meta.hot) import.meta.hot.dispose(stopInstallPrompt)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
