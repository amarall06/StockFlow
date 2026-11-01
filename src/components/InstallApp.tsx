import { useState, useSyncExternalStore } from 'react'
import { canInstall, installApp, subscribeInstall } from '../lib/install-prompt'

export function InstallApp() {
  const available = useSyncExternalStore(subscribeInstall, canInstall, () => false)
  const [error, setError] = useState('')
  if (!available && !error) return null
  return <>{available && <button type="button" onClick={() => {
    setError('')
    void installApp().catch(() => setError('Não foi possível abrir a instalação. Tente pelo menu do navegador.'))
  }}>Instalar aplicativo</button>}{error && <p role="status">{error}</p>}</>
}
