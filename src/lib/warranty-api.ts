import { supabase } from './supabase'

export type WarrantyManufacturer = { id: string; name: string; updated_at: string; shock_boxes?: number; spring_boxes?: number }

export async function loadWarrantyManufacturers(includeBoxes = false): Promise<WarrantyManufacturer[]> {
  if (!supabase) throw new Error('Não foi possível conectar ao banco.')
  const [manufacturers, balances] = await Promise.all([
    supabase.from('warranty_manufacturers').select('id, name, updated_at').order('name'),
    includeBoxes ? supabase.from('warranty_box_balances').select('manufacturer_id, product_kind, quantity') : Promise.resolve({ data: [], error: null }),
  ])
  if (manufacturers.error || balances.error) throw new Error('Não foi possível carregar os fabricantes e seus saldos. Confira a conexão e tente atualizar.')
  const totals = new Map<string, { shock: number; spring: number }>()
  for (const row of balances.data ?? []) {
    const total = totals.get(row.manufacturer_id) ?? { shock: 0, spring: 0 }
    if (row.product_kind === 'shock') total.shock = row.quantity
    if (row.product_kind === 'spring') total.spring = row.quantity
    totals.set(row.manufacturer_id, total)
  }
  return (manufacturers.data ?? []).map((manufacturer) => ({ ...manufacturer,
    shock_boxes: includeBoxes ? totals.get(manufacturer.id)?.shock ?? 0 : undefined,
    spring_boxes: includeBoxes ? totals.get(manufacturer.id)?.spring ?? 0 : undefined,
  }))
}

// O vínculo usa ID: corrigir o nome no futuro não exigirá trocar a identidade do fabricante.
export async function saveWarrantyManufacturer(name: string, previous: WarrantyManufacturer | null): Promise<WarrantyManufacturer> {
  const normalizedName = name.trim().replace(/\s+/gu, ' ')
  if (!normalizedName || normalizedName.length > 100) throw new Error('Informe um fabricante entre 1 e 100 caracteres.')
  if (!supabase) throw new Error('Não foi possível conectar ao banco.')
  const { data, error } = await supabase.rpc('save_warranty_manufacturer', {
    p_name: normalizedName, p_id: previous?.id ?? null, p_expected_updated_at: previous?.updated_at ?? null,
  })
  if (error) {
    if (error.code === '23505') throw new Error('Esse fabricante já está cadastrado.')
    if (error.code === '40001') throw new Error('Este cadastro foi alterado por outra pessoa. Atualize a lista antes de editar novamente.')
    throw new Error('Não foi possível salvar o fabricante. Confira a conexão e a permissão de administrador.')
  }
  if (!data || typeof data.id !== 'string' || typeof data.name !== 'string' || typeof data.updated_at !== 'string') {
    throw new Error('O banco não confirmou o cadastro. Atualize a lista para conferir.')
  }
  return data as WarrantyManufacturer
}

export async function changeWarrantyBoxes(input: {
  manufacturerId: string; kind: 'shock' | 'spring'; direction: 'in' | 'out'; quantity: number; note: string; requestId: string
}): Promise<void> {
  if (!Number.isInteger(input.quantity) || input.quantity < 1) throw new Error('Informe uma quantidade inteira maior que zero.')
  if (!supabase) throw new Error('Não foi possível conectar ao banco.')
  const { data, error } = await supabase.rpc('change_warranty_boxes', {
    p_manufacturer_id: input.manufacturerId, p_product_kind: input.kind, p_direction: input.direction,
    p_quantity: input.quantity, p_note: input.note.trim() || null, p_request_id: input.requestId,
  })
  if (error) {
    if (error.code === 'P0001') throw new Error('Saldo insuficiente. Feche esta janela e atualize a lista antes de retirar.')
    throw new Error('Não foi possível confirmar a operação. Tente novamente com os mesmos dados ou confira a lista.')
  }
  if (!data || typeof data.id !== 'string') throw new Error('A confirmação não chegou. Tente novamente com os mesmos dados para conferir esta operação.')
}
