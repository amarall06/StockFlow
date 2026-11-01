import { normalizeTransfer, type TransferInput } from './transfer-api'
export type OfflineTransfer = { id: string; userId: string; input: TransferInput; phase: 'draft' | 'uncertain' | 'confirmed' }
export const offlineTransfersKey = (userId: string) => `liber:offline-transfers:v1:${userId}`
export function readOfflineTransfers(userId: string): OfflineTransfer[] {
  const rows = JSON.parse(localStorage.getItem(offlineTransfersKey(userId)) ?? '[]') as OfflineTransfer[]
  if (!Array.isArray(rows) || rows.length > 100) throw new Error('Preserve os rascunhos de transferência para revisão: armazenamento inválido.')
  for (const row of rows) {
    if (!row || row.userId !== userId || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(row.id) || !['draft','uncertain','confirmed'].includes(row.phase)) throw new Error('Rascunho de transferência inválido. Preserve os dados para revisão.')
    normalizeTransfer(row.input)
  }
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Identificadores de transferência repetidos. Preserve os dados para revisão.')
  return rows
}
export function updateOfflineTransfer(userId: string, id: string, phase: OfflineTransfer['phase'] | null) {
  const rows = readOfflineTransfers(userId)
  const next = phase === null ? rows.filter(row => row.id !== id) : rows.map(row => row.id === id ? { ...row, phase } : row)
  if (phase && !rows.some(row => row.id === id)) throw new Error('O rascunho não está mais disponível nesta conta.')
  const value = JSON.stringify(next), key = offlineTransfersKey(userId)
  localStorage.setItem(key, value)
  if (localStorage.getItem(key) !== value) throw new Error('Não foi possível confirmar a atualização do pedido neste aparelho. Preserve o identificador original.')
  window.dispatchEvent(new Event('liber:offline-operations'))
}
