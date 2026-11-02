import type { StockRow } from './inventory-api'
export type Capacity = { boxes: number; basis: string }
export type Capacities = Record<string, Capacity>
export type CapacityMode = 'demo' | 'stock'
export const demoLocations = ['NORTE', 'SUL', 'LESTE', 'OESTE']
export const demoCapacities: Capacities = Object.fromEntries(demoLocations.map((code, i) => [code, { boxes: [40, 60, 30, 50][i], basis: 'Caixa padrão fictícia' }]))
export const demoStock: StockRow[] = [
  { code: 'AGM-35', location: 'NORTE', status: 'Aguardando testagem', boxes: 20 },
  { code: 'AGM-35', location: 'NORTE', status: 'Liberado para venda', boxes: 20 },
  { code: 'MGM-35', location: 'SUL', status: 'Em estoque', boxes: 12 },
  { code: 'AGM-35', location: 'LESTE', status: 'Liberado para venda', boxes: 33 },
]
export function parseCapacities(raw: string | null, userId: string): Capacities {
  if (raw === null) return {}
  const value = JSON.parse(raw)
  if (!value || value.version !== 1 || value.userId !== userId || !value.entries || typeof value.entries !== 'object' || Array.isArray(value.entries) || Object.keys(value.entries).length > 1000) throw Error('Configuração de capacidade inválida. Os dados foram preservados para revisão.')
  for (const [code, entry] of Object.entries(value.entries) as [string, Capacity][]) {
    if (!code.trim() || code.length > 100 || !entry || !Number.isSafeInteger(entry.boxes) || entry.boxes < 1 || entry.boxes > 2147483647 || typeof entry.basis !== 'string' || !entry.basis.trim() || entry.basis.length > 120) throw Error('Capacidade inválida. Informe caixas inteiras positivas e a referência de tamanho.')
  }
  return value.entries as Capacities
}
export function capacityRows(locations: string[], stock: StockRow[], entries: Capacities) {
  const used = new Map<string, number>()
  for (const row of stock) {
    if (!Number.isSafeInteger(row.boxes) || row.boxes < 0) throw Error('Saldo inválido para calcular ocupação.')
    const total = (used.get(row.location) ?? 0) + row.boxes
    if (!Number.isSafeInteger(total)) throw Error('Saldo inválido para calcular ocupação.')
    used.set(row.location, total)
  }
  return [...new Set([...locations, ...used.keys()])].map(location => {
    const boxes = used.get(location) ?? 0
    const capacity = Object.hasOwn(entries, location) ? entries[location] : null
    return { location, boxes, capacity, percent: capacity ? boxes / capacity.boxes * 100 : null, excess: capacity ? Math.max(0, boxes - capacity.boxes) : 0 }
  })
}
const event = 'liber:shelf-capacity'
export const capacityKey = (userId: string, mode: CapacityMode) => `liber:shelf-capacity:v1:${mode}:${userId}`
export function readCapacityRaw(userId: string, mode: CapacityMode) {
  try { return localStorage.getItem(capacityKey(userId, mode)) } catch { return '!storage-unavailable' }
}
export function subscribeCapacities(listener: () => void) {
  window.addEventListener(event, listener); window.addEventListener('storage', listener); window.addEventListener('focus', listener)
  return () => { window.removeEventListener(event, listener); window.removeEventListener('storage', listener); window.removeEventListener('focus', listener) }
}
export function saveCapacities(userId: string, mode: CapacityMode, entries: Capacities, expectedRaw: string | null) {
  if (!userId || readCapacityRaw(userId, mode) !== expectedRaw) throw Error('A configuração mudou em outra aba. Feche e reabra a edição antes de salvar.')
  const raw = JSON.stringify({ version: 1, userId, entries })
  parseCapacities(raw, userId)
  localStorage.setItem(capacityKey(userId, mode), raw)
  if (localStorage.getItem(capacityKey(userId, mode)) !== raw) throw Error('O aparelho não confirmou a gravação da capacidade.')
  window.dispatchEvent(new Event(event))
}
