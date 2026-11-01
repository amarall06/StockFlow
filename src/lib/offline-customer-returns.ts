import type { WarrantyReturnInput } from './warranty-returns'
import type { WarrantyReturn } from './warranty-returns'
import { validateOfflineReturn } from './offline-return-validation'
function normalizeReturn(input: WarrantyReturnInput) { if(!input || input.status!=='received' || input.manufacturer_id!==null || !['shock','spring','unknown'].includes(input.product_kind) || !['ours','other','unknown'].includes(input.ownership) || !Number.isSafeInteger(input.boxes) || input.boxes<1 || input.boxes>2147483647 || typeof input.description!=='string' || !input.description.trim() || input.description.length>300 || typeof input.reason!=='string' || !input.reason.trim() || input.reason.length>500 || typeof input.location!=='string' || !input.location.trim() || input.location.length>100 || typeof input.product_code!=='string' || input.product_code.length>60 || input.destination!=='')throw new Error('Confira descrição, motivo, local e quantidade da devolução recebida.') }
export type OfflineCustomerReturn = { id: string; userId: string; returnId: string; input: WarrantyReturnInput; expectedUpdatedAt?: string; previous?: WarrantyReturn; phase: 'draft' | 'uncertain' | 'confirmed' }
export const offlineCustomerReturnsKey = (userId: string) => `liber:offline-customer-returns:v1:${userId}`
export function readOfflineCustomerReturns(userId: string): OfflineCustomerReturn[] {
  const rows = JSON.parse(localStorage.getItem(offlineCustomerReturnsKey(userId)) ?? '[]') as OfflineCustomerReturn[]
  if (!Array.isArray(rows) || rows.length > 100) throw new Error('Preserve os rascunhos de devolução para revisão: armazenamento inválido.')
  for (const row of rows) {
    if (!row || row.userId !== userId || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(row.id) || !['draft','uncertain','confirmed'].includes(row.phase)) throw new Error('Rascunho de devolução inválido. Preserve os dados para revisão.')
    if(!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(row.returnId))throw new Error('Identificador de devolução inválido.');
    if (row.expectedUpdatedAt !== undefined) {
      if (!row.previous || row.previous.id !== row.returnId || row.previous.updated_at !== row.expectedUpdatedAt || !Number.isFinite(Date.parse(row.expectedUpdatedAt))) throw new Error('Versão da devolução indisponível. Preserve o pedido para revisão.')
      validateOfflineReturn(row.input, row.previous)
    } else { if(row.previous)throw new Error('Versão da devolução ausente.'); normalizeReturn(row.input) }
  }
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Identificadores de devolução repetidos. Preserve os dados para revisão.')
  return rows
}
export function updateOfflineCustomerReturn(userId: string, id: string, phase: OfflineCustomerReturn['phase'] | null) {
  const rows = readOfflineCustomerReturns(userId)
  const next = phase === null ? rows.filter(row => row.id !== id) : rows.map(row => row.id === id ? { ...row, phase } : row)
  if (phase && !rows.some(row => row.id === id)) throw new Error('O rascunho não está mais disponível nesta conta.')
  const value = JSON.stringify(next), key = offlineCustomerReturnsKey(userId)
  localStorage.setItem(key, value)
  if (localStorage.getItem(key) !== value) throw new Error('Não foi possível confirmar a atualização do pedido neste aparelho. Preserve o identificador original.')
  window.dispatchEvent(new Event('liber:offline-operations'))
}
