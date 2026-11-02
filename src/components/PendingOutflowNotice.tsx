import { useSyncExternalStore } from 'react'
import { readPendingOutflow } from '../lib/pending-outflow'

const subscribe = (listener: () => void) => {
  window.addEventListener('storage', listener)
  window.addEventListener('focus', listener)
  window.addEventListener('liber:pending-outflow', listener)
  return () => { window.removeEventListener('storage', listener); window.removeEventListener('focus', listener); window.removeEventListener('liber:pending-outflow', listener) }
}
export function PendingOutflowNotice({ userId, onOpen }: { userId: string; onOpen: () => void }) {
  const state = useSyncExternalStore(subscribe, () => {
    const { pending, error } = readPendingOutflow(userId)
    return error ? 'invalid' : pending?.phase ?? ''
  }, () => '')
  if (!state) return null
  return <p role="status">
    {state === 'invalid' ? 'Há um pedido de saída ilegível nesta aba. Preserve os dados e confira o histórico com o administrador.' : state === 'confirmed' ? 'Uma saída já confirmada aguarda atualização da consulta nesta aba. Não registre novamente.' : 'Há uma saída com confirmação pendente nesta aba. Ela pode já ter sido registrada; confira o pedido original antes de iniciar outra.'}
    {' '}<button type="button" className="theme-toggle" onClick={onOpen}>Revisar confirmação de saída</button>
  </p>
}
