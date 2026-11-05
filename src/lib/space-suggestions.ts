import type { StockRow } from './inventory-api'
import type { Capacities } from './shelf-capacity'
export type StorageRequest = { kind: 'shock' | 'spring'; status: StockRow['status']; boxes: number; basis: string }
export const spaceChecks = {
  NORTE: { kinds: ['shock'], statuses: ['Aguardando testagem', 'Liberado para venda'], verifiedFree: 0, basis: 'Caixa padrão', divergence: false },
  SUL: { kinds: ['spring'], statuses: ['Em estoque'], verifiedFree: 30, basis: 'Caixa padrão', divergence: false },
  LESTE: { kinds: ['shock'], statuses: ['Liberado para venda'], verifiedFree: 10, basis: 'Caixa padrão', divergence: true },
  OESTE: { kinds: ['shock', 'spring'], statuses: ['Aguardando testagem', 'Liberado para venda', 'Em estoque'], verifiedFree: 40, basis: 'Caixa padrão', divergence: false },
}
const basisKey = (value: string) => value.replace('Caixa padrão fictícia', 'Caixa padrão').trim().toLocaleLowerCase('pt-BR')
export function suggestSpaces(stock: StockRow[], capacities: Capacities, request: StorageRequest, checks = spaceChecks) {
  if (!Number.isSafeInteger(request.boxes) || request.boxes < 1 || request.boxes > 2147483647 || !request.basis.trim() || !['shock', 'spring'].includes(request.kind) || (request.kind === 'spring' ? request.status !== 'Em estoque' : !['Aguardando testagem', 'Liberado para venda'].includes(request.status))) throw Error('Informe categoria, situação, padrão de caixa e quantidade inteira positiva compatíveis.')
  const used = new Map<string, number>()
  for (const row of stock) {
    if (!Number.isSafeInteger(row.boxes) || row.boxes < 0) throw Error('Saldo inválido para sugerir espaço.')
    const total = (used.get(row.location) ?? 0) + row.boxes
    if (!Number.isSafeInteger(total)) throw Error('Saldo inválido para sugerir espaço.')
    used.set(row.location, total)
  }
  const locations = Object.entries(checks).map(([location, check]) => {
    const capacity = Object.hasOwn(capacities, location) ? capacities[location] : null
    const boxes = used.get(location) ?? 0, reasons: string[] = []
    if (!capacity || !Number.isSafeInteger(capacity.boxes) || capacity.boxes < 1) reasons.push('Capacidade não informada')
    if (!check.kinds.includes(request.kind)) reasons.push('Categoria incompatível')
    if (!check.statuses.includes(request.status)) reasons.push('Situação incompatível')
    if (check.divergence) reasons.push('Divergência de contagem pendente')
    if (!Number.isSafeInteger(check.verifiedFree) || check.verifiedFree < 0) reasons.push('Espaço físico não conferido')
    if (!capacity || basisKey(capacity.basis) !== basisKey(request.basis) || basisKey(check.basis) !== basisKey(request.basis)) reasons.push('Padrão de caixa incompatível')
    const logicalFree = capacity ? Math.max(0, capacity.boxes - boxes) : 0
    const available = Math.min(logicalFree, Math.max(0, Number.isSafeInteger(check.verifiedFree) ? check.verifiedFree : 0))
    const shortfall = reasons.length === 0 && available < request.boxes ? request.boxes - available : null
    if (available < request.boxes) reasons.push('Espaço insuficiente para toda a quantidade')
    return { location, used: boxes, available, logicalFree, verifiedFree: check.verifiedFree, reasons, shortfall, remaining: available - request.boxes }
  })
  return { suggestions: locations.filter(row => !row.reasons.length).sort((a, b) => a.remaining - b.remaining || a.location.localeCompare(b.location)), excluded: locations.filter(row => row.reasons.length) }
}
