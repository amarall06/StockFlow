import type { StockRow } from './inventory-api'
export const fictionalMapOrder = ['NORTE', 'OESTE', 'LESTE', 'SUL'] as const
export const fictionalCounts = { LESTE: { reference: 33, counted: 31 } }
export function fictionalShelfMap(stock: StockRow[], query: string) {
  const normalized = query.trim().toUpperCase()
  for (const row of stock) {
    if (!fictionalMapOrder.includes(row.location as typeof fictionalMapOrder[number]) || !Number.isSafeInteger(row.boxes) || row.boxes < 0) throw Error('Dados inválidos para o mapa fictício.')
  }
  const shelves = fictionalMapOrder.map(location => {
    const rows = stock.filter(row => row.location === location)
    const boxes = rows.reduce((sum, row) => sum + row.boxes, 0)
    const matchedBoxes = normalized ? rows.filter(row => row.code.toUpperCase().includes(normalized)).reduce((sum, row) => sum + row.boxes, 0) : 0
    if (!Number.isSafeInteger(boxes) || !Number.isSafeInteger(matchedBoxes)) throw Error('Quantidade inválida para o mapa fictício.')
    const count = location === 'LESTE' ? fictionalCounts.LESTE : null
    return { location, rows, boxes, matchedBoxes, count, state: count ? 'Divergência de contagem' : boxes > 0 ? 'Ocupada' : 'Sem caixas' }
  })
  return { shelves, normalized, matches: shelves.filter(row => row.matchedBoxes > 0) }
}
