type WarrantyInput = { manufacturerId: string; kind: 'shock'|'spring'; direction: 'in'|'out'; quantity: number; note: string };
function normalizeWarranty(input: WarrantyInput) { if(!input || typeof input.manufacturerId !== 'string' || !input.manufacturerId || !['shock','spring'].includes(input.kind) || !['in','out'].includes(input.direction) || !Number.isSafeInteger(input.quantity) || input.quantity<1 || input.quantity>2147483647 || typeof input.note !== 'string' || input.note.length>500) throw new Error('Confira fabricante, categoria, direção, quantidade e observação da garantia.') }
export type OfflineWarranty = { id: string; userId: string; manufacturerName?: string; input: WarrantyInput; phase: 'draft' | 'uncertain' | 'confirmed' }
export const offlineWarrantyKey = (userId: string) => `liber:offline-warranty:v1:${userId}`
export function readOfflineWarranty(userId: string): OfflineWarranty[] {
  const rows = JSON.parse(localStorage.getItem(offlineWarrantyKey(userId)) ?? '[]') as OfflineWarranty[]
  if (!Array.isArray(rows) || rows.length > 100) throw new Error('Preserve os rascunhos de garantia para revisão: armazenamento inválido.')
  for (const row of rows) {
    if (!row || row.userId !== userId || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(row.id) || !['draft','uncertain','confirmed'].includes(row.phase)) throw new Error('Rascunho de garantia inválido. Preserve os dados para revisão.')
    normalizeWarranty(row.input)
  }
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Identificadores de garantia repetidos. Preserve os dados para revisão.')
  return rows
}
export function updateOfflineWarranty(userId: string, id: string, phase: OfflineWarranty['phase'] | null) {
  const rows = readOfflineWarranty(userId)
  const next = phase === null ? rows.filter(row => row.id !== id) : rows.map(row => row.id === id ? { ...row, phase } : row)
  if (phase && !rows.some(row => row.id === id)) throw new Error('O rascunho não está mais disponível nesta conta.')
  const value = JSON.stringify(next), key = offlineWarrantyKey(userId)
  localStorage.setItem(key, value)
  if (localStorage.getItem(key) !== value) throw new Error('Não foi possível confirmar a atualização do pedido neste aparelho. Preserve o identificador original.')
  window.dispatchEvent(new Event('liber:offline-operations'))
}
