import { Fragment, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { allowedReturnStatuses, loadWarrantyReturns, returnStatusLabels, saveWarrantyReturn, type WarrantyReturn, type WarrantyReturnInput } from '../lib/warranty-returns'
import type { WarrantyManufacturer } from '../lib/warranty-api'
import { EditButton } from './EditButton'
import './WarrantyReturns.css'
import { useModalDialog } from '../lib/use-modal-dialog'
import { confirmOperation } from '../lib/confirm-operation'
import { startResumeRefresh } from '../lib/resume-refresh'
import { saveOfflineCustomerReturns } from '../lib/offline-stock'
import { Badge, Card, Table } from './Interface'
import { NavigationIcon } from './NavigationIcon'

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
  const busy = useRef(false)
  // Guarda apenas os campos do formulário, sem misturar os metadados de auditoria.
  const [input, setInput] = useState<WarrantyReturnInput>(() => previous ? Object.fromEntries(
    Object.keys(initialReturn).map((key) => [key, previous[key as keyof WarrantyReturnInput]]),
  ) as WarrantyReturnInput : { ...initialReturn })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const locked = previous?.status === 'warranty'
  const statuses = locked ? ['warranty', 'closed'] as const : allowedReturnStatuses(input)

  useModalDialog(dialog)

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
    if (saving || busy.current) return
    if (!Number.isInteger(input.boxes) || input.boxes < 1) { setError('Informe uma quantidade inteira positiva de caixas.'); return }
    busy.current=true
    setSaving(true)
    setError('')
    try {
      if(!confirmOperation('Confirmar registro de devolução?', [
        `Produto: ${input.product_code||input.description}`, `Local: ${input.location}`,
        `Quantidade: ${input.boxes} caixas`, `Andamento: ${returnStatusLabels[input.status]}`,
        `Fabricante: ${manufacturers.find(row=>row.id===input.manufacturer_id)?.name??'Não identificado'}`,
        `Motivo: ${input.reason}`, ...(input.destination?[`Destino: ${input.destination}`]:[]),
        input.status==='warranty'&&previous?.status!=='warranty'?'As caixas serão somadas à garantia do fabricante.':
          previous?.status==='warranty'&&input.status==='closed'?'As caixas serão retiradas da garantia do fabricante.':'O estoque normal para venda não é alterado.',
      ]))return
      requestId.current ??= crypto.randomUUID()
      await saveWarrantyReturn(id.current, input, previous?.updated_at ?? null, requestId.current)
      onSaved()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível salvar.') }
    finally { busy.current=false; setSaving(false) }
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

export function WarrantyReturns({ ready, isAdministrator, manufacturers, revision, onChanged, canAutoRefresh, userId = '' }: {
  userId?: string; ready: boolean; isAdministrator: boolean; manufacturers: WarrantyManufacturer[]; revision: number; onChanged: () => void; canAutoRefresh?: () => boolean
}) {
  const [result, setResult] = useState<{ revision: number; rows: WarrantyReturn[]; error: string }>({ revision: -1, rows: [], error: '' })
  const [editing, setEditing] = useState<WarrantyReturn | null | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [message, setMessage] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const prefix = useId()
  const [automaticError, setAutomaticError] = useState({ revision: -1, message: '' })
  const loading = ready && result.revision !== revision
  useEffect(() => {
    if (!ready) return
    let current = true
    let initialPending = true
    let hasReport = false
    function publish(rows: WarrantyReturn[]) {
      if (!current) return
      hasReport = true; saveOfflineCustomerReturns(userId, rows)
      setResult({ revision, rows, error: '' })
      setAutomaticError({ revision, message: '' })
    }
    void loadWarrantyReturns().then(publish)
      .catch((error) => { if (current) setResult({ revision, rows: [], error: error instanceof Error ? error.message : 'Não foi possível carregar.' }) })
      .finally(() => { initialPending = false })
    const stop = startResumeRefresh({
      intervalMs: 30_000, load: loadWarrantyReturns, apply: publish,
      canRefresh: () => !initialPending && (canAutoRefresh?.() ?? true) && !document.querySelector('dialog[open]'),
      onError: () => {
        if (hasReport) setAutomaticError({ revision, message: 'Não foi possível atualizar as devoluções automaticamente. Os dados anteriores permanecem na tela.' })
        else setResult({ revision, rows: [], error: 'Não foi possível carregar as devoluções. Tente atualizar a lista.' })
      },
    })
    return () => { current = false; stop() }
  }, [ready, revision, canAutoRefresh, userId])
  const names = new Map(manufacturers.map((m) => [m.id, m.name]))
  const filtered = result.rows.filter((row) => (!status || row.status === status)
    && `${row.product_code} ${row.description} ${row.location} ${row.reason} ${names.get(row.manufacturer_id ?? '') ?? ''}`.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')))
  const totals = [
    {label: 'Em acompanhamento', icon: <NavigationIcon name="history"/>, count: result.rows.filter(row => !['warranty', 'closed'].includes(row.status)).length},
    {label: 'Em garantia', icon: <NavigationIcon name="warranty"/>, count: result.rows.filter(row => row.status === 'warranty').length},
    {label: 'Encerradas', icon: '×', count: result.rows.filter(row => row.status === 'closed').length},
  ]
  return <>
    <div className="warranty-metrics" aria-label="Resumo das devoluções consultadas">{totals.map(item => <Card key={item.label}><span className="warranty-metric-icon" aria-hidden="true">{item.icon}</span><div><span>{item.label}</span><strong>{!ready || loading || result.error ? '—' : item.count}</strong><small>{item.count === 1 ? 'registro' : 'registros'}</small></div></Card>)}</div>
    <section className="inventory-panel warranty-returns" aria-labelledby="returns-title">
    <div className="panel-heading"><h2 id="returns-title" tabIndex={-1}>Casos de garantia</h2>{ready && isAdministrator && <button className="add-product-button" type="button" onClick={() => setEditing(null)}>Novo registro</button>}</div>
    {!ready ? <p className="manufacturer-notice">O acompanhamento de devoluções aguarda ativação no banco.</p> : <>
      <details className="warranty-filters"><summary>Filtros e atualização</summary><div className="manufacturer-list-tools"><label>Buscar devolução<input type="search" value={search} onChange={(e) => setSearch(e.target.value)} /></label><label>Andamento<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos</option>{Object.entries(returnStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className="theme-toggle" type="button" disabled={loading} onClick={onChanged}>Atualizar devoluções</button></div></details>
      {message && <p className="manufacturer-feedback manufacturer-success" role="status">{message}</p>}
      {automaticError.revision === revision && automaticError.message && <p className="manufacturer-feedback auth-error" role="status">{automaticError.message}</p>}
      {loading ? <p className="manufacturer-feedback" role="status">Carregando devoluções…</p> : result.error ? <p className="manufacturer-feedback auth-error" role="alert">{result.error}</p> : <>
        {!filtered.length && <p className="manufacturer-feedback">Nenhuma devolução encontrada.</p>}
        {!!filtered.length && <Table aria-label="Casos de garantia"><thead><tr><th scope="col">Registro</th><th scope="col">Código</th><th scope="col">Motivo</th><th scope="col">Data</th><th scope="col">Situação</th></tr></thead><tbody>{filtered.map((row, index) => <Fragment key={row.id}>
          <tr><th scope="row"><button type="button" className="warranty-record" aria-label={`Detalhes da devolução ${row.product_code || row.description}`} aria-expanded={expanded === row.id} aria-controls={`${prefix}-${index}`} onClick={() => setExpanded(expanded === row.id ? null : row.id)} title={row.id}>{row.id.slice(0, 8)} <span aria-hidden="true">{expanded === row.id ? '−' : '+'}</span></button></th><td>{row.product_code || 'Não identificado'}</td><td className="warranty-reason">{row.reason}</td><td><time dateTime={row.created_at}>{new Date(row.created_at).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})}</time></td><td><Badge className={row.status === 'closed' ? 'warranty-status-neutral' : ''}>{returnStatusLabels[row.status]}</Badge></td></tr>
          <tr id={`${prefix}-${index}`} hidden={expanded !== row.id} className="warranty-detail-row"><td colSpan={5}><div className="warranty-case-detail">
          <div className="manufacturer-card-header"><h3>{row.product_code || 'Código não identificado'}</h3>{isAdministrator && row.status !== 'closed' && <EditButton label={`Atualizar devolução ${row.product_code || row.description}`} onClick={() => setEditing(row)} />}</div>
          <p>{row.description}</p><p><strong>Registro:</strong> {row.id}</p>
          <dl><div><dt>Caixas</dt><dd>{row.boxes}</dd></div><div><dt>Categoria</dt><dd>{row.product_kind === 'shock' ? 'Amortecedores' : row.product_kind === 'spring' ? 'Molas' : 'Não identificada / outro item'}</dd></div><div><dt>Fabricante</dt><dd>{names.get(row.manufacturer_id ?? '') ?? 'Não identificado'}</dd></div><div><dt>Local</dt><dd>{row.location}</dd></div><div><dt>Conferência</dt><dd>{row.ownership === 'ours' ? 'Confirmada como nossa' : row.ownership === 'other' ? 'Não é nossa / item errado' : 'Ainda não conferida'}</dd></div><div><dt>Recebida em</dt><dd>{new Date(row.created_at).toLocaleString('pt-BR')}</dd></div></dl>
          <p><strong>Motivo:</strong> {row.reason}</p>{row.destination && <p><strong>Destino:</strong> {row.destination}</p>}
          </div></td></tr>
        </Fragment>)}</tbody></Table>}
        <p className="manufacturer-feedback warranty-query-scope">Consulta limitada às 100 devoluções mais recentes. Resumo e filtros se aplicam a esses registros. Toque no registro para ver detalhes e ações.</p>
      </>}
      {editing !== undefined && <ReturnDialog previous={editing} manufacturers={manufacturers} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); setMessage('Devolução salva. Saldos atualizados quando houver entrada ou saída da garantia.'); onChanged() }} />}
    </>}
  </section>
  </>
}
