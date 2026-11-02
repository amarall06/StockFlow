import type { StockRow } from './inventory-api'
import { isSpringCode } from './product-category'

export type CountRow = Pick<StockRow, 'code' | 'status'> & { expected: number; counted: number | null }
export type ShelfCount = { version: 1; userId: string; id: string; location: string; consultedAt: string; startedAt: string; reference: string; rows: CountRow[]; notes: string }
const statuses: StockRow['status'][] = ['Aguardando testagem', 'Liberado para venda', 'Em estoque']
export const countRowKey = (row: Pick<CountRow, 'code' | 'status'>) => JSON.stringify([row.code, row.status])
export function validCountStatus(code: string, status: string) {
  return statuses.includes(status as StockRow['status']) && (isSpringCode(code) ? status === 'Em estoque' : status !== 'Em estoque')
}
function quantity(value: unknown): value is number { return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 2147483647 }
export function shelfReference(stock: StockRow[], location: string) {
  const rows = new Map<string, { code: string; status: StockRow['status']; boxes: number }>()
  for (const row of stock.filter(row => row.location === location)) {
    if (!quantity(row.boxes) || !validCountStatus(row.code, row.status)) throw new Error('Saldo inválido para iniciar a contagem.')
    if (!row.boxes) continue
    const key = countRowKey(row), previous = rows.get(key)
    const boxes = (previous?.boxes ?? 0) + row.boxes
    if (!quantity(boxes)) throw new Error('Saldo inválido para iniciar a contagem.')
    rows.set(key, { code: row.code, status: row.status, boxes })
  }
  return JSON.stringify([...rows.values()].sort((a, b) => countRowKey(a).localeCompare(countRowKey(b))))
}
export function beginShelfCount(userId: string, location: string, stock: StockRow[], consultedAt: string): ShelfCount {
  if (!userId || !location || !Number.isFinite(Date.parse(consultedAt))) throw new Error('Consulte o estoque antes de iniciar a contagem.')
  const reference = shelfReference(stock, location)
  const rows = (JSON.parse(reference) as Array<StockRow>).map(row => ({ code: row.code, status: row.status, expected: row.boxes, counted: null }))
  if (rows.length > 1000) throw new Error('Esta prateleira excede o limite de 1.000 itens do rascunho local.')
  return { version: 1, userId, id: crypto.randomUUID(), location, consultedAt, startedAt: new Date().toISOString(), reference, rows, notes: '' }
}
export function parseShelfCount(raw: string | null, userId: string): ShelfCount | null {
  if (raw === null) return null
  const value = JSON.parse(raw) as ShelfCount
  if (!value || value.version !== 1 || value.userId !== userId || typeof value.id !== 'string' || !value.id || typeof value.location !== 'string' || !value.location || !Number.isFinite(Date.parse(value.consultedAt)) || !Number.isFinite(Date.parse(value.startedAt)) || typeof value.reference !== 'string' || typeof value.notes !== 'string' || value.notes.length > 2000 || !Array.isArray(value.rows) || value.rows.length > 1000) throw new Error('Rascunho de contagem inválido. Preserve os dados para revisão.')
  const reference = JSON.parse(value.reference) as Array<{ code: string; status: StockRow['status']; boxes: number }>
  if (!Array.isArray(reference) || reference.some(row => !row || typeof row.code !== 'string' || !quantity(row.boxes) || !validCountStatus(row.code, row.status))) throw new Error('Referência de contagem inválida.')
  const seen = new Set<string>()
  for (const row of value.rows) {
    if (!row || typeof row.code !== 'string' || !/^[A-Z]{3}-(100|[1-9][0-9]?|0[1-9])([A-Z]{1,3})?$/.test(row.code) || !validCountStatus(row.code, row.status) || !quantity(row.expected) || (row.counted !== null && !quantity(row.counted)) || seen.has(countRowKey(row))) throw new Error('Item de contagem inválido.')
    seen.add(countRowKey(row))
    if (row.expected !== (reference.find(item => countRowKey(item) === countRowKey(row))?.boxes ?? 0)) throw new Error('Referência de contagem divergente.')
  }
  if (reference.some(row => !seen.has(countRowKey(row)))) throw new Error('Contagem incompleta em relação à referência.')
  return value
}
export function countSummary(draft: ShelfCount) {
  const counted = draft.rows.filter(row => row.counted !== null)
  const differences = counted.filter(row => row.counted !== row.expected)
  return { pending: draft.rows.length - counted.length, differences: differences.length,
    missing: differences.reduce((sum, row) => sum + Math.max(0, row.expected - row.counted!), 0),
    extra: differences.reduce((sum, row) => sum + Math.max(0, row.counted! - row.expected), 0) }
}
export const shelfCountHeaders = ['Rascunho', 'Estado', 'Prateleira', 'Consulta de referência', 'Início da contagem', 'Produto', 'Situação', 'Esperado (caixas)', 'Contado (caixas)', 'Diferença (caixas)', 'Saldo consultado mudou', 'Observação']
export function shelfCountReport(draft: ShelfCount, changed: boolean) {
  if (!draft.rows.length || countSummary(draft).pending) throw new Error('Preencha todos os itens antes de exportar para revisão.')
  return draft.rows.map(row => [draft.id, 'Rascunho local — não aprovado', draft.location, draft.consultedAt, draft.startedAt, row.code, row.status, row.expected, row.counted!, row.counted! - row.expected, changed ? 'Sim — recontagem necessária' : 'Não detectado na consulta atual', draft.notes])
}
