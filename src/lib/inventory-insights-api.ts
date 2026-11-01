import { supabase } from './supabase'
import { readAllRows } from './read-all-rows'
import { inventoryInsights, type InsightMovement } from './inventory-insights'
export async function loadInventoryInsights(days: number) {
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
  inventoryInsights({}, [], result.data)
  return { movements: result.data, asOf: asOf.toISOString(), start: start.toISOString() }
}
