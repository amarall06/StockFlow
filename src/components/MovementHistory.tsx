import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { springCodePrefixes } from '../lib/product-category'
import './MovementHistory.css'

type Movement = {
  id: string
  created_at: string
  movement_type: string
  quantity: number
  unit_type: string
  status_before: string | null
  status_after: string | null
  performed_by: string | null
  notes: string | null
  product: { code: string } | null
  origin: { code: string } | null
  destination: { code: string } | null
}

const PAGE_SIZE = 25
const typeLabels: Record<string, string> = {
  receipt: 'Recebimento', transfer: 'Transferência', testing: 'Testagem', inventory_adjustment: 'Ajuste de inventário',
}
const statusLabels: Record<string, string> = {
  awaiting_test: 'Aguardando testagem', released_for_sale: 'Liberado para venda', in_stock: 'Em estoque',
}
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

// Consulta apenas o histórico autorizado pelas políticas RLS da conta conectada.
export function MovementHistory() {
  const [code, setCode] = useState('')
  const [type, setType] = useState('')
  const [category, setCategory] = useState('')
  const [filters, setFilters] = useState({ code: '', type: '', category: '' })
  const [page, setPage] = useState(0)
  const [revision, setRevision] = useState(0)
  const [rows, setRows] = useState<Movement[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [hasNextPage, setHasNextPage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isCurrentRequest = true
    setLoading(true)
    setError('')

    async function loadHistory() {
      if (!supabase) throw new Error('Supabase não configurado.')
      let query = supabase.from('stock_movements').select(`
        id, created_at, movement_type, quantity, unit_type, status_before, status_after, performed_by, notes,
        product:products!inner(code),
        origin:locations!stock_movements_from_location_id_fkey(code),
        destination:locations!stock_movements_to_location_id_fkey(code)
      `).order('created_at', { ascending: false }).order('id', { ascending: false })

      if (filters.type) query = query.eq('movement_type', filters.type)
      // A categoria é filtrada no banco antes da paginação, usando os mesmos prefixos do estoque.
      if (filters.category === 'springs') {
        query = query.or(springCodePrefixes.map((prefix) => `code.like.${prefix}-%`).join(','), { referencedTable: 'product' })
      } else if (filters.category === 'shocks') {
        for (const prefix of springCodePrefixes) query = query.not('product.code', 'like', `${prefix}-%`)
      }
      // Escapa os caracteres especiais do filtro para buscar o texto digitado literalmente.
      if (filters.code) query = query.ilike('product.code', `%${filters.code.replace(/[\\%_]/g, '\\$&')}%`)
      const { data, error: queryError } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
      if (queryError) throw queryError
      const movements = (data ?? []) as unknown as Movement[]
      const visibleMovements = movements.slice(0, PAGE_SIZE)
      const userIds = [...new Set(visibleMovements.flatMap((row) => row.performed_by ? [row.performed_by] : []))]
      const visibleNames: Record<string, string> = {}

      if (userIds.length) {
        // A política de perfis limita quais nomes podem ser lidos; nunca consultamos auth.users.
        const profiles = await supabase.from('profiles').select('id, display_name').in('id', userIds)
        if (!profiles.error) {
          for (const profile of profiles.data ?? []) {
            if (profile.display_name) visibleNames[profile.id] = profile.display_name
          }
        }
      }
      if (!isCurrentRequest) return
      setRows(visibleMovements)
      setNames(visibleNames)
      setHasNextPage(movements.length > PAGE_SIZE)
    }

    void loadHistory().catch(() => {
      if (isCurrentRequest) {
        setRows([])
        setError('Não foi possível carregar as movimentações. Confira a conexão e tente atualizar.')
      }
    }).finally(() => {
      if (isCurrentRequest) setLoading(false)
    })
    // Impede que uma resposta antiga substitua o resultado de um filtro mais recente.
    return () => { isCurrentRequest = false }
  }, [filters, page, revision])

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFilters({ code: code.trim().toUpperCase(), type, category })
    setPage(0)
  }

  return <>
    <div className="page-heading">
      <div><p className="eyebrow">CONTROLE DE ESTOQUE</p><h1>Histórico de movimentações</h1><p className="subtitle">Entradas e transferências de amortecedores e molas, da mais recente para a mais antiga.</p></div>
      <button className="theme-toggle" type="button" onClick={() => setRevision((value) => value + 1)} disabled={loading}>Atualizar</button>
    </div>
    <section className="inventory-panel history-panel" aria-label="Movimentações do estoque">
      <form className="history-filters" onSubmit={applyFilters}>
        <label>Categoria<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Amortecedores e molas</option><option value="shocks">Amortecedores</option><option value="springs">Molas</option></select></label>
        <label>Código do produto<input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Ex.: AGM-35 ou MGM-35" /></label>
        <label>Tipo de operação<select value={type} onChange={(event) => setType(event.target.value)}><option value="">Todos os tipos</option>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button className="add-product-button" type="submit">Filtrar</button>
      </form>
      {loading ? <p className="history-message" role="status">Carregando movimentações…</p>
        : error ? <p className="history-message auth-error" role="alert">{error}</p>
          : rows.length === 0 ? <p className="history-message" role="status">Nenhuma movimentação encontrada para estes filtros.</p>
            : <div className="table-wrap"><table>
              <thead><tr><th>DATA E HORA</th><th>PRODUTO / OPERAÇÃO</th><th>QUANTIDADE</th><th>ORIGEM → DESTINO</th><th>SITUAÇÃO</th><th>RESPONSÁVEL</th></tr></thead>
              <tbody>{rows.map((row) => <tr key={row.id}>
                <td><time dateTime={row.created_at}>{dateFormatter.format(new Date(row.created_at))}</time></td>
                <td><strong>{row.product?.code ?? 'Produto indisponível'}</strong><small className="history-detail">{typeLabels[row.movement_type] ?? row.movement_type}</small>{row.notes && <small className="history-detail history-note">{row.notes}</small>}</td>
                <td>{row.quantity} {row.unit_type === 'box' ? (row.quantity === 1 ? 'caixa' : 'caixas') : (row.quantity === 1 ? 'peça' : 'peças')}</td>
                <td>{row.origin?.code ?? '—'} → {row.destination?.code ?? '—'}</td>
                <td>{row.status_before && row.status_before !== row.status_after && <small className="history-detail">{statusLabels[row.status_before] ?? row.status_before} →</small>}{row.status_after ? statusLabels[row.status_after] ?? row.status_after : '—'}</td>
                <td>{row.performed_by ? names[row.performed_by] ?? `Usuário ${row.performed_by.slice(0, 8)}` : 'Não registrado'}</td>
              </tr>)}</tbody>
            </table></div>}
      <div className="history-pagination"><span>Página {page + 1} · até {PAGE_SIZE} registros por página</span><div><button className="theme-toggle" type="button" disabled={loading || page === 0} onClick={() => setPage((value) => value - 1)}>Anterior</button><button className="theme-toggle" type="button" disabled={loading || !!error || !hasNextPage} onClick={() => setPage((value) => value + 1)}>Próxima</button></div></div>
      <p className="table-note">Horários no fuso deste dispositivo. Quando o nome não está disponível, mostramos parte do identificador da conta. Os saldos iniciais fictícios aparecem como ajustes de inventário.</p>
    </section>
  </>
}
