import { normalizeTransfer, type TransferInput } from './transfer-api'

export type PendingTransfer = { version: 1; userId: string; requestId: string; input: TransferInput; phase: 'uncertain' | 'confirmed' }
const key = (userId: string) => `liber.transfer.pending.v1:${userId}`
export function readPendingTransfer(userId: string): { pending: PendingTransfer | null; error: string } {
  try {
    if (!userId) throw new Error('Conta ausente.')
    const raw = window.sessionStorage.getItem(key(userId))
    if (!raw) return { pending: null, error: '' }
    const pending = JSON.parse(raw) as PendingTransfer
    if (pending.version !== 1 || pending.userId !== userId || !['uncertain', 'confirmed'].includes(pending.phase)
      || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(pending.requestId)) throw new Error('Pedido inválido.')
    normalizeTransfer(pending.input)
    return { pending, error: '' }
  } catch {
    return { pending: null, error: 'Não foi possível recuperar o pedido nesta aba. Novas transferências estão bloqueadas. Peça ao administrador para conferir o histórico antes de limpar os dados do navegador.' }
  }
}
export function savePendingTransfer(pending: PendingTransfer) {
  try {
    const value = JSON.stringify(pending)
    window.sessionStorage.setItem(key(pending.userId), value)
    if (window.sessionStorage.getItem(key(pending.userId)) !== value) throw new Error('Não salvo.')
  } catch { throw new Error('Não foi possível guardar o pedido nesta aba. Nenhuma nova transferência foi enviada.') }
}
export function clearPendingTransfer(userId: string) {
  window.sessionStorage.removeItem(key(userId))
  if (window.sessionStorage.getItem(key(userId)) !== null) throw new Error('Não foi possível encerrar o pedido nesta aba.')
}
