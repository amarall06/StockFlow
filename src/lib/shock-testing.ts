import { supabase } from './supabase'
import { isSpringCode } from './product-category'

export type ShockApproval = {
  id: string; product_code: string; location_code: string; boxes: number;
  actor_display_name: string; created_at: string;
}
export const TEST_HISTORY_PAGE_SIZE = 10

export async function loadShockApprovals(code: string, page: number) {
  if (!supabase) throw new Error('Não foi possível conectar ao banco.')
  const { data, error } = await supabase.from('shock_test_approvals')
    .select('id, product_code, location_code, boxes, actor_display_name, created_at')
    .eq('product_code', code).order('created_at', { ascending: false }).order('id', { ascending: false })
    .range(page * TEST_HISTORY_PAGE_SIZE, (page + 1) * TEST_HISTORY_PAGE_SIZE)
  if (error) throw new Error('Não foi possível carregar os registros de testagem. Tente atualizar.')
  const rows = data as ShockApproval[]
  return { rows: rows.slice(0, TEST_HISTORY_PAGE_SIZE), hasNext: rows.length > TEST_HISTORY_PAGE_SIZE }
}

// O responsável e a data são definidos no servidor a partir da sessão autenticada.
export async function approveShockBoxes(code: string, location: string, boxes: number, requestId: string) {
  if (isSpringCode(code) || !Number.isInteger(boxes) || boxes < 1) throw new Error('Informe caixas inteiras de amortecedores; molas não são testadas.')
  if (!supabase) throw new Error('Não foi possível conectar ao banco.')
  const { data, error } = await supabase.rpc('approve_shock_boxes', {
    p_product_code: code, p_location_code: location, p_boxes: boxes, p_request_id: requestId,
  })
  if (error) {
    if (error.code === 'P0001') throw new Error('O saldo aguardando teste mudou ou é insuficiente. Feche a janela e atualize o estoque.')
    if (error.code === 'P0003') throw new Error('Preencha seu nome em Meu perfil antes de registrar o teste.')
    if (error.code === '42501') throw new Error('Somente Administrador ou Testador pode registrar a aprovação.')
    throw new Error('Não foi possível confirmar. Tente novamente com a mesma quantidade para conferir o envio.')
  }
  if (!data?.id) throw new Error('A confirmação não chegou. Tente novamente com a mesma quantidade.')
}
