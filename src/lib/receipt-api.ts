import { supabase } from './supabase'
import { isSpringCode } from './product-category'

export type Supplier = { id: string; name: string }
export type ReceiptInput = { code: string; application: string; location: string; boxes: number; status: string; supplierId: string; lot: string }

export function normalizeReceipt(input: ReceiptInput) {
  const code = input.code.trim().toUpperCase()
  const lot = input.lot.trim()
  if (!/^[A-Z]{3}-(100|[1-9][0-9]?)$/.test(code) || !input.location.trim() || !Number.isInteger(input.boxes) || input.boxes < 1 || input.boxes > 2147483647) throw new Error('Confira código, local e quantidade inteira positiva.')
  if (lot.length > 100 || (lot && !input.supplierId)) throw new Error('Para informar um lote, selecione seu fornecedor. Use até 100 caracteres.')
  const status = isSpringCode(code) ? 'in_stock' : input.status
  if (!['awaiting_test','released_for_sale','in_stock'].includes(status) || (!isSpringCode(code) && status === 'in_stock')) throw new Error('Situação inválida para este produto.')
  return { p_code: code, p_application: input.application.trim() || null, p_location: input.location.trim().toUpperCase(), p_boxes: input.boxes, p_status: status, p_supplier_id: input.supplierId || null, p_lot_reference: lot || null }
}

export async function loadSuppliers(): Promise<Supplier[]> {
  if (!supabase) throw new Error('Banco não configurado.')
  const { data, error } = await supabase.from('suppliers').select('id,name').order('name')
  if (error) throw new Error('Não foi possível carregar fornecedores. Tente atualizar.')
  return data as Supplier[]
}

export async function createSupplier(name: string): Promise<Supplier> {
  const normalized = name.trim().replace(/\s+/gu,' ')
  if (!normalized || normalized.length > 100) throw new Error('Informe um nome entre 1 e 100 caracteres.')
  if (!supabase) throw new Error('Banco não configurado.')
  const { data, error } = await supabase.rpc('create_supplier',{p_name:normalized})
  if (error || !data?.id) throw new Error('Não foi possível cadastrar o fornecedor. Confira conexão e permissão de administrador.')
  return data as Supplier
}

// Usa um único envio para gravar produto (quando novo), saldo, origem da entrada e histórico.
export async function receiveWithSupplier(input: ReceiptInput, requestId: string): Promise<void> {
  const payload = normalizeReceipt(input)
  if (!supabase) throw new Error('Banco não configurado.')
  const { data, error } = await supabase.rpc('receive_stock_with_supplier',{...payload,p_request_id:requestId})
  if (error) {
    if (error.code === '42501') throw new Error('Sua função não permite esta entrada, situação ou cadastro de produto novo.')
    if (error.code === '22023') throw new Error('Confira código, aplicação, local, fornecedor e lote.')
    throw new Error('A confirmação não chegou. Tente novamente com os mesmos dados para conferir este envio.')
  }
  if (!data?.id) throw new Error('O banco não confirmou a entrada. Repita com os mesmos dados para conferir o envio.')
}
