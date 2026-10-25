import { useEffect, useRef, useState, type FormEvent } from 'react'
import { allowedReturnStatuses, loadWarrantyReturns, returnStatusLabels, saveWarrantyReturn, type WarrantyReturn, type WarrantyReturnInput } from '../lib/warranty-returns'
import type { WarrantyManufacturer } from '../lib/warranty-api'
import { EditButton } from './EditButton'
import './WarrantyReturns.css'

const initialReturn: WarrantyReturnInput = {
  manufacturer_id: null, product_kind: 'unknown', product_code: '', description: '', boxes: 1,
  reason: '', location: '', ownership: 'unknown', status: 'received', destination: '',
}

function ReturnDialog({ previous, manufacturers, onClose, onSaved }: {
  previous: WarrantyReturn | null; manufacturers: WarrantyManufacturer[]; onClose: () => void; onSaved: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const id = useRef(previous?.id ?? crypto.randomUUID())
  const requestId = useRef<string | null>(null)
  // Guarda apenas os campos do formulário, sem misturar os metadados de auditoria.
  const [input, setInput] = useState<WarrantyReturnInput>(() => previous ? Object.fromEntries(
    Object.keys(initialReturn).map((key) => [key, previous[key as keyof WarrantyReturnInput]]),
  ) as WarrantyReturnInput : { ...initialReturn })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const locked = previous?.status === 'warranty'
  const statuses = locked ? ['warranty', 'closed'] as const : allowedReturnStatuses(input)

  useEffect(() => { const element = dialog.current; element?.showModal(); return () => { element?.close() } }, [])

  function change<K extends keyof WarrantyReturnInput>(key: K, value: WarrantyReturnInput[K]) {
    requestId.current = null
    setError('')
    setInput((current) => {
      const next = { ...current, [key]: value }
      // Se a categoria mudar para mola, remove uma seleção antiga de testagem.
      if (!allowedReturnStatuses(next).includes(next.status)) next.status = 'received'
      return next
    })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    if (!Number.isInteger(input.boxes) || input.boxes < 1) { setError('Informe uma quantidade inteira positiva de caixas.'); return }
    setSaving(true)
    setError('')
    try {
      requestId.current ??= crypto.randomUUID()
      await saveWarrantyReturn(id.current, input, previous?.updated_at ?? null, requestId.current)
      onSaved()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível salvar.') }
    finally { setSaving(false) }
  }

  return <dialog ref={dialog} className="warranty-box-dialog warranty-return-dialog" aria-labelledby="return-title"
    onCancel={(event) => { event.preventDefault(); if (!saving) onClose() }}>
    <div className="warranty-box-dialog-heading"><h2 id="return-title">{previous ? 'Atualizar devolução' : 'Receber devolução'}</h2><button className="theme-toggle" type="button" disabled={saving} onClick={onClose}>Fechar</button></div>
    <form onSubmit={submit}><fieldset disabled={saving}>
      <label>Descrição do que chegou<input required maxLength={300} value={input.description} onChange={(e) => change('description', e.target.value)} placeholder="Ex.: caixa devolvida com amortecedor" /></label>
      <div className="return-form-grid">
        <label>Categoria<select disabled={locked} value={input.product_kind} onChange={(e) => change('product_kind', e.target.value as WarrantyReturnInput['product_kind'])}><option value="unknown">Ainda não identificada / outro item</option><option value="shock">Amortecedores</option><option value="spring">Molas</option></select></label>
        <label>Identificação da peça<select disabled={locked} value={input.ownership} onChange={(e) => change('ownership', e.target.value as WarrantyReturnInput['ownership'])}><option value="unknown">Ainda não conferida</option><option value="ours">Confirmada como nossa</option><option value="other">Não é nossa / item errado</option></select></label>
        <label>Fabricante<select disabled={locked} required={input.status === 'warranty'} value={input.manufacturer_id ?? ''} onChange={(e) => change('manufacturer_id', e.target.value || null)}><option value="">Ainda não identificado</option>{manufacturers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        <label>Código da peça (se identificado)<input disabled={locked} maxLength={60} value={input.product_code} onChange={(e) => change('product_code', e.target.value.toUpperCase())} /></label>
        <label>Quantidade de caixas<input disabled={locked} type="number" min="1" max="2147483647" step="1" required value={input.boxes || ''} onChange={(e) => change('boxes', Number(e.target.value))} /></label>
        <label>Local atual<input required maxLength={100} value={input.location} onChange={(e) => change('location', e.target.value)} placeholder="Ex.: prateleira de devoluções" /></label>
      </div>
      <label>Motivo / relato da devolução<textarea required maxLength={500} value={input.reason} onChange={(e) => change('reason', e.target.value)} /></label>
      <label>Andamento<select value={input.status} onChange={(e) => change('status', e.target.value as WarrantyReturnInput['status'])}>{statuses.map((s) => <option key={s} value={s}>{returnStatusLabels[s]}</option>)}</select></label>
      {input.status === 'closed' && <label>Destino / conclusão<input required maxLength={300} value={input.destination} onChange={(e) => change('destination', e.target.value)} placeholder="Informe o destino efetivamente confirmado" /></label>}
    </fieldset>
      <p>{input.product_kind === 'spring' ? 'Molas não passam por testagem. ' : ''}Receber uma devolução não altera o estoque para venda.</p>
      <p>{locked ? 'Ao encerrar, as caixas serão retiradas do saldo do fabricante. O registro encerrado fica disponível para consulta.' : 'Ao selecionar Em garantia, as caixas serão somadas ao fabricante. Não repita essa entrada pelo botão Adicionar caixas.'}</p>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="add-product-button" type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar devolução'}</button>
    </form>
  </dialog>
}

export function WarrantyReturns({ ready, isAdministrator, manufacturers, revision, onChanged }: {
  ready: boolean; isAdministrator: boolean; manufacturers: WarrantyManufacturer[]; revision: number; onChanged: () => void
}) {
  const [result, setResult] = useState<{ revision: number; rows: WarrantyReturn[]; error: string }>({ revision: -1, rows: [], error: '' })
  const [editing, setEditing] = useState<WarrantyReturn | null | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [message, setMessage] = useState('')
  const loading = ready && result.revision !== revision
  useEffect(() => {
    if (!ready) return
    let current = true
    void loadWarrantyReturns().then((rows) => { if (current) setResult({ revision, rows, error: '' }) })
      .catch((error) => { if (current) setResult({ revision, rows: [], error: error instanceof Error ? error.message : 'Não foi possível carregar.' }) })
    return () => { current = false }
  }, [ready, revision])
  const names = new Map(manufacturers.map((m) => [m.id, m.name]))
  const filtered = result.rows.filter((row) => (!status || row.status === status)
    && `${row.product_code} ${row.description} ${row.location} ${row.reason} ${names.get(row.manufacturer_id ?? '') ?? ''}`.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')))
  return <section className="inventory-panel warranty-returns" aria-labelledby="returns-title">
    <div className="panel-heading"><div><h2 id="returns-title">Devoluções recebidas</h2><p>Acompanhe a conferência, o local e o destino de cada recebimento.</p></div>{ready && isAdministrator && <button className="add-product-button" type="button" onClick={() => setEditing(null)}>Receber devolução</button>}</div>
    {!ready ? <p className="manufacturer-notice">O acompanhamento de devoluções aguarda ativação no banco.</p> : <>
      <div className="manufacturer-list-tools"><label>Buscar devolução<input type="search" value={search} onChange={(e) => setSearch(e.target.value)} /></label><label>Andamento<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos</option>{Object.entries(returnStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className="theme-toggle" type="button" disabled={loading} onClick={onChanged}>Atualizar devoluções</button></div>
      {message && <p className="manufacturer-feedback manufacturer-success" role="status">{message}</p>}
      {loading ? <p className="manufacturer-feedback" role="status">Carregando devoluções…</p> : result.error ? <p className="manufacturer-feedback auth-error" role="alert">{result.error}</p> : <>
        <p className="manufacturer-feedback">Consulta limitada às 100 devoluções mais recentes. Os filtros se aplicam a esses registros.</p>
        {!filtered.length && <p className="manufacturer-feedback">Nenhuma devolução encontrada.</p>}
        <ul className="return-cards">{filtered.map((row) => <li key={row.id}>
          <div className="manufacturer-card-header"><h3>{row.product_code || 'Código não identificado'}</h3>{isAdministrator && row.status !== 'closed' && <EditButton label={`Atualizar devolução ${row.product_code || row.description}`} onClick={() => setEditing(row)} />}</div>
          <span className="return-status">{returnStatusLabels[row.status]}</span><p>{row.description}</p>
          <dl><div><dt>Caixas</dt><dd>{row.boxes}</dd></div><div><dt>Categoria</dt><dd>{row.product_kind === 'shock' ? 'Amortecedores' : row.product_kind === 'spring' ? 'Molas' : 'Não identificada / outro item'}</dd></div><div><dt>Fabricante</dt><dd>{names.get(row.manufacturer_id ?? '') ?? 'Não identificado'}</dd></div><div><dt>Local</dt><dd>{row.location}</dd></div><div><dt>Conferência</dt><dd>{row.ownership === 'ours' ? 'Confirmada como nossa' : row.ownership === 'other' ? 'Não é nossa / item errado' : 'Ainda não conferida'}</dd></div><div><dt>Recebida em</dt><dd>{new Date(row.created_at).toLocaleString('pt-BR')}</dd></div></dl>
          <p><strong>Motivo:</strong> {row.reason}</p>{row.destination && <p><strong>Destino:</strong> {row.destination}</p>}
        </li>)}</ul>
      </>}
      {editing !== undefined && <ReturnDialog previous={editing} manufacturers={manufacturers} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); setMessage('Devolução salva. Saldos atualizados quando houver entrada ou saída da garantia.'); onChanged() }} />}
    </>}
  </section>
}
