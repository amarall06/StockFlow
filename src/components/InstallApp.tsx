import { lazy, Suspense, useState, useSyncExternalStore } from 'react'
import { canInstall, installApp, subscribeInstall } from '../lib/install-prompt'
const InstallGuide = lazy(() => import('./InstallGuide').then(module => ({ default: module.InstallGuide })))

export function InstallApp() {
  const available = useSyncExternalStore(subscribeInstall, canInstall, () => false)
  const [error, setError] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  function requestInstall() {
    setError('')
    void installApp().catch(() => setError('Não foi possível abrir a instalação. Tente pelo menu do navegador.'))
  }
  return <>
    {available && <button type="button" onClick={requestInstall}>Instalar aplicativo</button>}
    <button type="button" onClick={() => setShowGuide(true)}>Como instalar no computador ou celular</button>
    {!showGuide && error && <p role="status">{error}</p>}
    {showGuide && <Suspense fallback={<p role="status">Abrindo instruções de instalação…</p>}><InstallGuide available={available} error={error} onInstall={requestInstall} onClose={() => setShowGuide(false)}/></Suspense>}
  </>
}
