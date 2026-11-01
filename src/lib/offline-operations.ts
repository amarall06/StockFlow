import { normalizeOutflow, type OutflowReason } from './outflow-api'
export type OfflineOperation = { id: string; userId: string; code: string; location: string; status: string; boxes: number; notes: string; createdAt: number; reason?: OutflowReason }
export const offlineOperationsKey = (userId: string) => `liber:offline-operations:v1:${userId}`
export function removeOfflineOperation(userId: string, id: string) {
  const key = offlineOperationsKey(userId)
  const value = JSON.stringify(readOfflineOperations(userId).filter(row => row.id !== id))
  localStorage.setItem(key, value)
  if (localStorage.getItem(key) !== value) throw new Error('Saída confirmada; não foi possível encerrar o rascunho local. Confira o pedido confirmado antes de continuar.')
  window.dispatchEvent(new Event('liber:offline-operations'))
}
export function readOfflineOperations(userId: string): OfflineOperation[] {
  const value: unknown = JSON.parse(localStorage.getItem(offlineOperationsKey(userId)) ?? '[]')
  if (!Array.isArray(value) || value.length > 100 || value.some(row => !row || row.userId !== userId || typeof row.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(row.id) || typeof row.code !== 'string' || typeof row.location !== 'string' || !['Aguardando testagem','Liberado para venda','Em estoque'].includes(row.status) || !Number.isSafeInteger(row.boxes) || row.boxes < 1 || typeof row.notes !== 'string' || row.notes.length > 500 || !Number.isFinite(row.createdAt))) throw new Error('Não foi possível ler os rascunhos offline. Preserve os dados deste aparelho para revisão.')
  for (const row of value) normalizeOutflow({row:{code:row.code,location:row.location,status:row.status,boxes:row.boxes},boxes:row.boxes,reason:row.reason??'sale',notes:row.notes,reference:''})
  if (new Set(value.map(row => row.id)).size !== value.length) throw new Error('Há identificadores repetidos nos rascunhos offline. Preserve os dados para revisão.')
  return value
}
