import { supabase } from './supabase'
import type { StockRow } from './inventory-api'
import { isSpringCode } from './product-category'

export const outflowLabels = { sale:'Venda', discard:'Descarte', supplier_return:'Devolução ao fornecedor' } as const
export type OutflowReason = keyof typeof outflowLabels
export function eligibleOutflows(rows: StockRow[], springs: boolean, reason: OutflowReason): StockRow[] {
  return rows.filter((row)=>row.boxes>0 && isSpringCode(row.code)===springs
    && (springs ? row.status==='Em estoque' : reason==='sale' ? row.status==='Liberado para venda' : ['Aguardando testagem','Liberado para venda'].includes(row.status)))
}
export type OutflowInput = { row: StockRow; boxes: number; reason: OutflowReason; notes: string; reference: string }
export function normalizeOutflow(input: OutflowInput) {
  const notes=input.notes.trim(), reference=input.reference.trim()
  if (!Number.isInteger(input.boxes) || input.boxes<1 || input.boxes>input.row.boxes) throw new Error('Informe caixas inteiras dentro do saldo disponível.')
  if (!Object.hasOwn(outflowLabels,input.reason) || !eligibleOutflows([input.row],isSpringCode(input.row.code),input.reason).length) throw new Error('Esta situação não permite o tipo de saída escolhido.')
  if (notes.length>500 || reference.length>100 || (input.reason!=='sale' && !notes)) throw new Error('Informe o motivo detalhado do descarte ou devolução. Use observação até 500 caracteres e referência até 100.')
  return {p_code:input.row.code,p_location:input.row.location,p_status:input.row.status==='Em estoque'?'in_stock':input.row.status==='Aguardando testagem'?'awaiting_test':'released_for_sale',p_boxes:input.boxes,p_reason:input.reason,p_notes:notes||null,p_reference:reference||null}
}
export async function registerOutflow(input: OutflowInput, requestId: string) {
  const payload=normalizeOutflow(input)
  if (!supabase) throw new Error('Banco não configurado.')
  const {data,error}=await supabase.rpc('register_stock_outflow',{...payload,p_request_id:requestId})
  if (error) {
    if (error.code==='P0001') throw new Error('O saldo mudou ou é insuficiente. Atualize o estoque antes de tentar novamente.')
    if (error.code==='42501') throw new Error('Somente Administrador pode registrar saídas nesta etapa.')
    if (error.code==='P0003') throw new Error('Preencha seu nome em Meu perfil antes de registrar a saída.')
    if (error.code==='22023') throw new Error('Confira a situação, quantidade e motivo da saída.')
    throw new Error('Não foi possível confirmar. Repita com os mesmos dados para conferir o envio.')
  }
  if (!data?.id) throw new Error('A confirmação não chegou. Repita com os mesmos dados para conferir o envio.')
}
