import { supabase } from './supabase'
import { isSpringCode } from './product-category'
import type { StockRow } from './inventory-api'

export type TransferInput = { row: StockRow; to: string; boxes: number }
export class TransferRejectedError extends Error {}
export function normalizeTransfer(input: TransferInput) {
  const { row } = input
  const to = input.to.trim().toUpperCase()
  if (!/^[A-Z]{3}-(100|[1-9][0-9]?|0[1-9])([A-Z]{1,3})?$/.test(row.code)
    || !row.location.trim() || !to || to === row.location.trim().toUpperCase()
    || !Number.isSafeInteger(row.boxes) || row.boxes < 1
    || !Number.isSafeInteger(input.boxes) || input.boxes < 1 || input.boxes > row.boxes
    || (isSpringCode(row.code) ? row.status !== 'Em estoque' : !['Aguardando testagem', 'Liberado para venda'].includes(row.status))) {
    throw new Error('Confira produto, origem, destino, situação e caixas inteiras dentro do saldo.')
  }
  return { p_product_code: row.code, p_from_location_code: row.location.trim().toUpperCase(), p_to_location_code: to,
    p_status_code: row.status === 'Em estoque' ? 'in_stock' : row.status === 'Aguardando testagem' ? 'awaiting_test' : 'released_for_sale', p_quantity: input.boxes }
}
export async function registerTransfer(input: TransferInput, requestId: string) {
  const payload = normalizeTransfer(input)
  if (!supabase) throw new Error('Banco não configurado.')
  const { data, error } = await supabase.rpc('transfer_stock_once', { ...payload, p_request_id: requestId })
  if (error) {
    if (['42501', '22023', 'P0002'].includes(error.code)) throw new TransferRejectedError('A transferência foi recusada. Confira sua permissão, o saldo e os locais; atualize o estoque.')
    throw new Error('Não foi possível confirmar a transferência. Confira o pedido pendente antes de registrar outra.')
  }
  if (data?.id !== requestId) throw new Error('A confirmação não chegou. Confira o pedido pendente com o mesmo identificador.')
}
