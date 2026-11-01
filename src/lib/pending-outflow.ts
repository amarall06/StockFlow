import { normalizeOutflow, type OutflowInput } from './outflow-api'

export type PendingOutflow = {
  version: 1; userId: string; requestId: string
  input: OutflowInput; phase: 'uncertain' | 'confirmed'
}
const key = (userId: string) => `liber.outflow.pending.v1:${userId}`
// sessionStorage sobrevive à recarga e à navegação, separado por aba e por conta.
// Não guarda senha/token. Fechar a aba ou limpar os dados do navegador não é coberto.
function storage(userId:string) {
  if (!userId) throw new Error('Não foi possível identificar sua conta para proteger o envio.')
  return window.sessionStorage
}
export function readPendingOutflow(userId:string):{pending:PendingOutflow|null;error:string} {
  if (typeof window==='undefined') return {pending:null,error:''}
  try {
    const raw=storage(userId).getItem(key(userId))
    if (!raw) return {pending:null,error:''}
    const pending=JSON.parse(raw) as PendingOutflow
    if (pending.version!==1 || pending.userId!==userId || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(pending.requestId)
      || !['uncertain','confirmed'].includes(pending.phase)
      || !pending.input || !/^[A-Z]{3}-(100|[1-9][0-9]?|0[1-9])([A-Z]{1,3})?$/.test(pending.input.row.code)
      || typeof pending.input.row.location!=='string' || !pending.input.row.location.trim()
      || !['Em estoque','Aguardando testagem','Liberado para venda'].includes(pending.input.row.status)
      || !Number.isInteger(pending.input.row.boxes) || pending.input.row.boxes<1) throw new Error('Pedido inválido.')
    normalizeOutflow(pending.input)
    return {pending,error:''}
  } catch {
    return {pending:null,error:'Não foi possível recuperar os dados do pedido nesta aba. Novas saídas estão bloqueadas; confira o histórico com o administrador antes de limpar dados do navegador.'}
  }
}
export function savePendingOutflow(pending:PendingOutflow) {
  try {
    const target=storage(pending.userId), value=JSON.stringify(pending)
    target.setItem(key(pending.userId),value)
    if(target.getItem(key(pending.userId))!==value) throw new Error('Gravação não confirmada.')
  } catch {throw new Error('Não foi possível guardar o pedido nesta aba. Nenhuma nova saída foi enviada. Habilite o armazenamento do navegador e tente novamente.')}
}
export function clearPendingOutflow(userId:string) {
  const target=storage(userId)
  target.removeItem(key(userId))
  if(target.getItem(key(userId))!==null) throw new Error('Não foi possível encerrar o pedido salvo nesta aba.')
}
