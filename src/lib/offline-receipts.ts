import { normalizeReceipt, type ReceiptInput } from './receipt-api'
export type OfflineReceipt = { id: string; userId: string; input: ReceiptInput; phase: 'draft' | 'uncertain' | 'confirmed' }
export const offlineReceiptsKey = (userId: string) => `liber:offline-receipts:v1:${userId}`
export function readOfflineReceipts(userId: string): OfflineReceipt[] {
  const rows = JSON.parse(localStorage.getItem(offlineReceiptsKey(userId)) ?? '[]') as OfflineReceipt[]
  if (!Array.isArray(rows) || rows.length > 100) throw new Error('Preserve os rascunhos de entrada para revisão: armazenamento inválido.')
  for (const row of rows) {
    if (!row || row.userId !== userId || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(row.id) || !['draft','uncertain','confirmed'].includes(row.phase)) throw new Error('Rascunho de entrada inválido. Preserve os dados para revisão.')
    normalizeReceipt(row.input)
  }
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Identificadores de entrada repetidos. Preserve os dados para revisão.')
  return rows
}
export function updateOfflineReceipt(userId: string, id: string, phase: OfflineReceipt['phase'] | null) {
  const rows = readOfflineReceipts(userId)
  const next = phase === null ? rows.filter(row => row.id !== id) : rows.map(row => row.id === id ? { ...row, phase } : row)
  if (phase && !rows.some(row => row.id === id)) throw new Error('O rascunho não está mais disponível nesta conta.')
  const value = JSON.stringify(next), key = offlineReceiptsKey(userId)
  localStorage.setItem(key, value)
  if (localStorage.getItem(key) !== value) throw new Error('Não foi possível confirmar a atualização do pedido neste aparelho. Preserve o identificador original.')
  window.dispatchEvent(new Event('liber:offline-operations'))
}
