import type { ProductInfo, StockRow } from './inventory-api'
export type InsightMovement = { id: string; created_at: string; quantity: number; product: { code: string } | null; origin: { code: string } | null; destination: { code: string } | null }
export function inventoryInsights(catalog: Record<string, ProductInfo>, stock: StockRow[], movements: InsightMovement[]) {
  const products = new Map<string, { code: string; boxes: number; locations: Set<string>; last: string | null }>()
  for (const row of stock) {
    if (!catalog[row.code] || row.boxes <= 0) continue
    const value = products.get(row.code) ?? { code: row.code, boxes: 0, locations: new Set<string>(), last: null }
    value.boxes += row.boxes; value.locations.add(row.location); products.set(row.code, value)
  }
  const locations = new Map<string, { code: string; operations: number; boxes: number; last: string }>()
  const seen = new Set<string>()
  for (const row of movements) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    if (!row.id || !Number.isFinite(Date.parse(row.created_at)) || !Number.isSafeInteger(row.quantity) || row.quantity < 1) throw new Error('O histórico de atividade chegou inválido. Atualize para tentar novamente.')
    const product = row.product && products.get(row.product.code)
    if (product && (!product.last || Date.parse(row.created_at) > Date.parse(product.last))) product.last = row.created_at
    // Uma operação no mesmo local conta uma vez. Transferências contam nos dois locais.
    for (const code of new Set([row.origin?.code, row.destination?.code].filter((code): code is string => Boolean(code)))) {
      const value = locations.get(code) ?? { code, operations: 0, boxes: 0, last: row.created_at }
      value.operations++; value.boxes += row.quantity
      if (Date.parse(row.created_at) > Date.parse(value.last)) value.last = row.created_at
      locations.set(code, value)
    }
  }
  // Inclui prateleiras com saldo e sem evento no período, sem inventar localização.
  return {
    products: [...products.values()].map(row => ({ ...row, locations: [...row.locations].sort() })).sort((a, b) => Number(Boolean(a.last)) - Number(Boolean(b.last)) || a.code.localeCompare(b.code)),
    locations: [...new Set([...stock.map(row => row.location), ...locations.keys()])].sort().map(code => locations.get(code) ?? { code, operations: 0, boxes: 0, last: null }),
  }
}
