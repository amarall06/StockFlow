import { supabase } from './supabase'

export const returnStatusLabels = {
  received: 'Recebida / em conferência', awaiting_test: 'Aguardando testagem',
  identification: 'Boa / aguardando identificação', warranty: 'Em garantia', closed: 'Encerrada',
} as const
export type ReturnStatus = keyof typeof returnStatusLabels
export type WarrantyReturnInput = {
  manufacturer_id: string | null; product_kind: 'shock' | 'spring' | 'unknown';
  product_code: string; description: string; boxes: number; reason: string;
  location: string; ownership: 'unknown' | 'ours' | 'other'; status: ReturnStatus; destination: string;
}
export type WarrantyReturn = WarrantyReturnInput & { id: string; created_at: string; updated_at: string }

// A mesma regra deixa as opções claras na tela; o SQL também valida, independentemente do navegador.
export function allowedReturnStatuses(input: Pick<WarrantyReturnInput, 'product_kind' | 'ownership'>): ReturnStatus[] {
  if (input.ownership !== 'ours' || input.product_kind === 'unknown') return ['received', 'closed']
  return input.product_kind === 'spring' ? ['received', 'warranty', 'closed']
    : ['received', 'awaiting_test', 'identification', 'warranty', 'closed']
}

export async function loadWarrantyReturns(): Promise<WarrantyReturn[]> {
  if (!supabase) throw new Error('Banco não configurado.')
  const { data, error } = await supabase.from('warranty_returns').select('*').order('created_at', { ascending: false }).limit(100)
  if (error) throw new Error('Não foi possível carregar as devoluções. Tente atualizar a lista.')
  return data as WarrantyReturn[]
}

// Um identificador por envio permite repetir a requisição sem duplicar entrada ou saída.
export async function saveWarrantyReturn(id: string, input: WarrantyReturnInput, expected: string | null, requestId: string): Promise<void> {
  if (!supabase) throw new Error('Banco não configurado.')
  const { data, error } = await supabase.rpc('save_warranty_return', {
    p_id: id, p_input: input, p_expected_updated_at: expected, p_request_id: requestId,
  })
  if (error) {
    if (error.code === '40001') throw new Error('Outra alteração foi salva. Feche a janela e atualize a lista antes de editar.')
    if (error.code === 'P0001') throw new Error('O saldo da garantia está menor que as caixas deste registro. Confira as retiradas manuais antes de encerrar.')
    if (error.code === '22023') throw new Error('Confira os campos, a categoria e o andamento. Molas não passam por testagem; encerrar exige um destino.')
    throw new Error('Não foi possível confirmar. Confira a conexão e tente novamente com os mesmos dados.')
  }
  if (!data?.id) throw new Error('A confirmação não chegou. Tente novamente com os mesmos dados.')
}
