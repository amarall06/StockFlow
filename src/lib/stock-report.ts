import { supabase } from './supabase'
import { loadInventorySnapshot } from './inventory-api'
import { readAllRows } from './read-all-rows'
import { reportPeriod, type ReportPeriod } from './report-period'

export type StockReport = {
  generatedAt: string; period: string; stock: (string | number)[][]; movements: (string | number)[][]
}
export const stockHeaders = ['Produto', 'Prateleira', 'Situação', 'Caixas atuais']
export const movementHeaders = ['Data', 'Produto', 'Movimento', 'Caixas', 'Origem', 'Destino']
const labels: Record<string, string> = { receipt: 'Recebimento', sale: 'Venda', transfer: 'Transferência', testing: 'Testagem', discard: 'Descarte', supplier_return: 'Devolução ao fornecedor', inventory_adjustment: 'Ajuste' }
export async function loadStockReport(day: string, period: ReportPeriod): Promise<StockReport> {
  const range = reportPeriod(day, period)
  const client = supabase
  if (!client) throw new Error('Banco não configurado.')
  type Movement = { created_at: string; movement_type: string; quantity: number; product: { code: string }; origin: { code: string } | null; destination: { code: string } | null }
  const [snapshot, movements] = await Promise.all([
    loadInventorySnapshot(),
    readAllRows<Movement>((from, to) => client.from('stock_movements').select('created_at, movement_type, quantity, product:products!inner(code), origin:locations!stock_movements_from_location_id_fkey(code), destination:locations!stock_movements_to_location_id_fkey(code)').eq('unit_type', 'box').gte('created_at', range.start).lt('created_at', range.end).order('created_at').order('id').range(from, to) as unknown as PromiseLike<{ data: Movement[] | null; error: unknown }>),
  ])
  if (movements.error) throw new Error('Não foi possível consultar todas as movimentações do período. Nenhum relatório foi gerado.')
  const format = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', dateStyle: 'short', timeStyle: 'short' })
  return {
    generatedAt: new Date().toISOString(), period: range.label,
    stock: snapshot.stock.map(row => [row.code, row.location, row.status, row.boxes]),
    movements: movements.data.map(row => [format.format(new Date(row.created_at)), row.product.code, labels[row.movement_type] ?? row.movement_type, row.quantity, row.origin?.code ?? '', row.destination?.code ?? '']),
  }
}
