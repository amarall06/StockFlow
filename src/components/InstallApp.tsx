import { useState, useSyncExternalStore } from 'react'
import { canInstall, installApp, subscribeInstall } from '../lib/install-prompt'

export function InstallApp() {
  const available = useSyncExternalStore(subscribeInstall, canInstall, () => false)
  const [error, setError] = useState('')
  function requestInstall() {
    setError('')
    void installApp().catch(() => setError('Não foi possível abrir a instalação. Tente pelo menu do navegador.'))
  }
  return <>
    <button type="button" onClick={() => available ? requestInstall() : setError('Use a opção Instalar ou Adicionar à tela inicial no menu do navegador. Se o app já estiver instalado, abra pelo ícone.')}>Instalar aplicativo</button>
    {error && <p role="status">{error}</p>}
  </>
}
