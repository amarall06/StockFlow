import { useSyncExternalStore } from 'react'
const subscribe = (listener: () => void) => {
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)
  return () => { window.removeEventListener('online', listener); window.removeEventListener('offline', listener) }
}
export function ConnectionStatus({ consultedAt }: { consultedAt: string }) {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
  if (online) return null
  return <p className="auth-error" role="status">Sem conexão. A tela conserva a consulta de {consultedAt ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', dateStyle: 'short', timeStyle: 'short' }).format(new Date(consultedAt)) : 'antes da desconexão'}. Os saldos podem ter mudado em outro aparelho. Para confirmar operações ou reabrir o sistema, reconecte-se.</p>
}
