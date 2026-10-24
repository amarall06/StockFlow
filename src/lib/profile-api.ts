import { supabase } from './supabase'

// O servidor identifica a conta pela sessão; não enviamos um ID de usuário editável.
export async function updateOwnDisplayName(name: string): Promise<string> {
  const normalizedName = name.trim()
  if (!normalizedName || normalizedName.length > 80) throw new Error('Informe um nome entre 1 e 80 caracteres.')
  if (!supabase) throw new Error('Não foi possível conectar ao banco.')
  const { data, error } = await supabase.rpc('update_own_display_name', { p_display_name: normalizedName })
  if (error) throw new Error('Não foi possível salvar o nome. Confira sua conexão e se a conta continua ativa.')
  if (typeof data !== 'string' || !data) throw new Error('O banco não confirmou a alteração. Recarregue a página para conferir.')
  return data
}
