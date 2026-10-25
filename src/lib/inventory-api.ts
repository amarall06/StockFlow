import { supabase } from './supabase'
import type { ProductInfo, ShockType, VehicleApplication } from './product-details'
import type { ApplicationHistoryRecord } from './application-history'
export type { ProductInfo, ShockType, VehicleApplication } from './product-details'
export { shockTypeLabels } from './product-details'

export type StockRow = {
  code: string
  location: string
  status: 'Aguardando testagem' | 'Liberado para venda' | 'Em estoque'
  boxes: number
}

export type InventorySnapshot = {
  apiVersion: number
  catalog: Record<string, ProductInfo>
  locations: string[]
  stock: StockRow[]
}

function getClient() {
  if (!supabase) throw new Error('Supabase não está configurado neste computador.')
  return supabase
}

// Busca os cadastros e saldos em caixas usando a sessão autenticada e as políticas RLS.
export async function loadInventorySnapshot(): Promise<InventorySnapshot> {
  const client = getClient()
  const { data: apiVersion, error: apiError } = await client.rpc('inventory_api_version')
  if (apiError) throw apiError

  const [productsResult, locationsResult, balancesResult, applicationsResult] = await Promise.all([
    Number(apiVersion) >= 3
      ? client.from('products').select(`id, code, application, default_location_id, updated_at, shock_type${Number(apiVersion) >= 12 ? ', minimum_boxes, minimum_updated_at' : ''}`).order('code')
      : client.from('products').select('id, code, application, default_location_id, updated_at').order('code'),
    // O total também considera caixas já guardadas em locais desativados.
    client.from('locations').select('id, code, is_active').order('code'),
    client.from('stock_balances')
      .select('product_id, location_id, status_code, quantity')
      .eq('unit_type', 'box')
      .in('status_code', ['awaiting_test', 'released_for_sale', 'in_stock']),
    Number(apiVersion) >= 3
      ? client.from('product_applications').select('product_id, vehicle_model, year_from, year_to, position').order('position')
      : Promise.resolve({ data: [], error: null }),
  ])

  if (productsResult.error) throw productsResult.error
  if (locationsResult.error) throw locationsResult.error
  if (balancesResult.error) throw balancesResult.error
  if (applicationsResult.error) throw applicationsResult.error

  const locationRows = (locationsResult.data ?? []) as Array<{ id: string; code: string; is_active: boolean }>
  const productRows = (productsResult.data ?? []) as Array<{
    id: string
    code: string
    application: string
    default_location_id: string | null
    updated_at: string
    shock_type?: ShockType | null
    minimum_boxes?: number | null
    minimum_updated_at?: string
  }>
  const applicationRows = (applicationsResult.data ?? []) as Array<{
    product_id: string; vehicle_model: string; year_from: number | null; year_to: number | null
  }>
  const applicationsByProduct = new Map<string, VehicleApplication[]>()
  for (const row of applicationRows) {
    const applications = applicationsByProduct.get(row.product_id) ?? []
    applications.push({ vehicleModel: row.vehicle_model, yearFrom: row.year_from, yearTo: row.year_to })
    applicationsByProduct.set(row.product_id, applications)
  }
  const balanceRows = (balancesResult.data ?? []) as Array<{
    product_id: string
    location_id: string
    status_code: string
    quantity: number
  }>
  const locationById = new Map(locationRows.map((location) => [location.id, location.code]))
  const productById = new Map(productRows.map((product) => [product.id, product]))
  const catalog: Record<string, ProductInfo> = {}

  for (const product of productRows) {
    catalog[product.code] = {
      application: product.application,
      vehicleApplications: applicationsByProduct.get(product.id) ?? [],
      shockType: product.shock_type ?? null,
      updatedAt: product.updated_at,
      minimumBoxes: product.minimum_boxes ?? null,
      minimumUpdatedAt: product.minimum_updated_at,
      defaultLocation: product.default_location_id
        ? locationById.get(product.default_location_id) ?? 'Não definida'
        : 'Não definida',
    }
  }

  const stock: StockRow[] = balanceRows.flatMap((balance) => {
    const product = productById.get(balance.product_id)
    const location = locationById.get(balance.location_id)
    if (!product || !location || balance.quantity < 1) return []
    return [{
      code: product.code,
      location,
      status: balance.status_code === 'in_stock' ? 'Em estoque' : balance.status_code === 'awaiting_test' ? 'Aguardando testagem' : 'Liberado para venda',
      boxes: balance.quantity,
    }]
  })

  return { apiVersion: Number(apiVersion), catalog, locations: locationRows.filter((location) => location.is_active).map((location) => location.code), stock }
}

// Mantém a correspondência entre o texto da tela e o código salvo no banco.
export function stockStatusCode(status: StockRow['status']): 'awaiting_test' | 'released_for_sale' | 'in_stock' {
  return status === 'Em estoque' ? 'in_stock' : status === 'Aguardando testagem' ? 'awaiting_test' : 'released_for_sale'
}

// Registra uma entrada via RPC; o banco grava saldo e auditoria juntos.
export async function receiveStock(input: {
  code: string
  location: string
  quantity: number
  status: ReturnType<typeof stockStatusCode>
}) {
  const { error } = await getClient().rpc('receive_stock', {
    p_product_code: input.code,
    p_location_code: input.location,
    p_quantity: input.quantity,
    p_status_code: input.status,
  })
  if (error) throw error
}

// Cadastra um produto e seu saldo inicial dentro da mesma transação do banco.
export async function registerProductAndReceive(input: {
  code: string
  application: string
  location: string
  quantity: number
  status: ReturnType<typeof stockStatusCode>
}) {
  const { error } = await getClient().rpc('register_product_and_receive', {
    p_product_code: input.code,
    p_application: input.application,
    p_default_location_code: input.location,
    p_quantity: input.quantity,
    p_status_code: input.status,
  })
  if (error) throw error
}

// Cadastra uma nova localização, liberada pelo banco apenas para administradores.
export async function createLocation(code: string) {
  const { error } = await getClient().from('locations').insert({ code })
  if (error) throw error
}

// Solicita uma transferência atômica e auditada ao banco de dados.
export async function transferStock(input: {
  code: string
  from: string
  to: string
  status: ReturnType<typeof stockStatusCode>
  quantity: number
}) {
  const { error } = await getClient().rpc('transfer_stock', {
    p_product_code: input.code,
    p_from_location_code: input.from,
    p_to_location_code: input.to,
    p_status_code: input.status,
    p_quantity: input.quantity,
  })
  if (error) throw error
}

// O servidor substitui a lista inteira em uma transação e detecta edições concorrentes.
export async function updateProductDetails(input: {
  code: string; shockType: ShockType | null; applications: VehicleApplication[]; expectedUpdatedAt: string
}): Promise<string> {
  const { data, error } = await getClient().rpc('update_product_details', {
    p_product_code: input.code,
    p_shock_type: input.shockType,
    p_applications: input.applications.map((application) => ({
      vehicle_model: application.vehicleModel, year_from: application.yearFrom, year_to: application.yearTo,
    })),
    p_expected_updated_at: input.expectedUpdatedAt,
  })
  if (error) {
    if (error.code === '40001') throw new Error('Outro cadastro foi salvo desde que esta tela abriu. Recarregue a página antes de editar novamente.')
    throw new Error('Não foi possível salvar. Confira os campos, sua permissão e a conexão com o banco.')
  }
  if (typeof data !== 'string') throw new Error('O banco não confirmou a atualização. Recarregue a página para conferir o cadastro.')
  return data
}

// Uma linha extra indica se existe outra página; o histórico completo não é truncado na prévia.
export async function loadApplicationHistory(code: string, page: number, pageSize: number): Promise<{
  rows: ApplicationHistoryRecord[]; hasMore: boolean
}> {
  const { data, error } = await getClient().from('product_application_history')
    .select('id, product_code, change_kind, details_before, details_after, performed_by, actor_display_name, created_at')
    .eq('product_code', code)
    .order('created_at', { ascending: false }).order('id', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize)
  if (error) throw new Error('Não foi possível carregar o histórico de aplicações. Confira a conexão e tente novamente.')
  const rows = (data ?? []) as unknown as ApplicationHistoryRecord[]
  const visibleRows = rows.slice(0, pageSize)
  const missingNames = [...new Set(visibleRows.flatMap((row) => !row.actor_display_name && row.performed_by ? [row.performed_by] : []))]
  const currentNames = new Map<string, string>()
  if (missingNames.length) {
    // Apenas nomes autorizados por RLS; a versão histórica original não é reescrita.
    const profiles = await getClient().from('profiles').select('id, display_name').in('id', missingNames)
    if (!profiles.error) {
      for (const profile of profiles.data ?? []) {
        if (profile.display_name) currentNames.set(profile.id, profile.display_name)
      }
    }
  }
  return {
    rows: visibleRows.map((row) => ({ ...row, actor_current_name: row.performed_by ? currentNames.get(row.performed_by) : undefined })),
    hasMore: rows.length > pageSize,
  }
}
