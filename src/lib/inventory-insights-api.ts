import { supabase } from './supabase'
import { readAllRows } from './read-all-rows'
import { inventoryInsights, type InsightMovement } from './inventory-insights'
import { lastProductMovements } from './last-product-movement'
import {regionalLocation} from './regional-locations'
export async function loadInventoryInsights(days: number, stockCodes: string[] = []) {
  if (![30, 90, 180, 365].includes(days)) throw new Error('Período inválido.')
  const client = supabase
  if (!client) throw new Error('Banco não configurado.')
  const asOf = new Date()
  const start = new Date(asOf.valueOf() - days * 86400000)
  const result = await readAllRows<InsightMovement>((from, to) => client.from('stock_movements')
    .select('id, created_at, quantity, product:products!inner(code), origin:locations!stock_movements_from_location_id_fkey(code), destination:locations!stock_movements_to_location_id_fkey(code)')
    .eq('unit_type', 'box').gte('created_at', start.toISOString()).lte('created_at', asOf.toISOString()).order('created_at').order('id').range(from, to) as unknown as PromiseLike<{ data: InsightMovement[] | null; error: unknown }>)
  if (result.error) throw new Error('Não foi possível consultar a atividade por produto e prateleira.')
  // Valida antes da publicação, para falha de dados seguir a mesma recuperação da rede.
  const movements=result.data.map(row=>({...row,origin:row.origin?{...row.origin,code:regionalLocation(row.origin.code)}:null,destination:row.destination?{...row.destination,code:regionalLocation(row.destination.code)}:null}))
  inventoryInsights({}, [], movements)
  const moved = new Set(movements.map(row => row.product?.code))
  const previous = await lastProductMovements(stockCodes.filter(code => !moved.has(code)), start.toISOString(), async code => {
    const { data, error } = await client.from('stock_movements')
      .select('created_at, product:products!inner(code)')
      .eq('unit_type', 'box').eq('product.code', code).lt('created_at', start.toISOString())
      .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(1)
    if (error || !Array.isArray(data)) throw new Error('Não foi possível consultar a última movimentação.')
    const row = data[0] as unknown as { created_at: string; product: { code: string } } | undefined
    return row ? { code: row.product?.code, created_at: row.created_at } : null
  })
  return { movements, previous, asOf: asOf.toISOString(), start: start.toISOString() }
}
