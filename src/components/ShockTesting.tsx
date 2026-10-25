import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { StockRow } from '../lib/inventory-api'
import { approveShockBoxes, loadShockApprovals, type ShockApproval } from '../lib/shock-testing'
import './ShockTesting.css'

// Ícone sem texto visível, mas com nome acessível para teclado e leitores de tela.
export function ShockTestButton({ code, onClick }: { code: string; onClick: () => void }) {
  const label = `Ver testagem de ${code}`
  return <button type="button" className="shock-test-button" title={label} aria-label={label} onClick={onClick}>
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 3h6M10 3v6L4 19a1.3 1.3 0 0 0 1.1 2h13.8a1.3 1.3 0 0 0 1.1-2L14 9V3M8 13h8M9 17l2 2 4-4" /></svg>
  </button>
}

const formatDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Bahia' })

export function ShockTestingDialog({ row, ready, canApprove, onClose, onRecorded }: {
  row: StockRow; ready: boolean; canApprove: boolean; onClose: () => void; onRecorded: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const requestId = useRef<string | null>(null)
  const [quantity, setQuantity] = useState('1')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<{ page: number; revision: number; rows: ShockApproval[]; hasNext: boolean; error: string }>({ page: -1, revision: -1, rows: [], hasNext: false, error: '' })
  const loading = ready && (result.page !== page || result.revision !== revision)
  const waiting = row.status === 'Aguardando testagem'

  useEffect(() => { const dialog = dialogRef.current; dialog?.showModal(); return () => { dialog?.close() } }, [])
  useEffect(() => {
    if (!ready) return
    let current = true
    void loadShockApprovals(row.code, page).then((data) => { if (current) setResult({ ...data, page, revision, error: '' }) })
      .catch((caught) => { if (current) setResult({ rows: [], hasNext: false, page, revision, error: caught instanceof Error ? caught.message : 'Não foi possível consultar.' }) })
    return () => { current = false }
  }, [ready, row.code, page, revision])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ready || !canApprove || !waiting || saving) return
    const boxes = Number(quantity)
    if (!Number.isInteger(boxes) || boxes < 1 || boxes > row.boxes) { setError('Confira a quantidade inteira e o saldo aguardando teste.'); return }
    setSaving(true)
    setError('')
    try {
      // A mesma tentativa mantém o ID se a resposta falhar, evitando descontar duas vezes.
      requestId.current ??= crypto.randomUUID()
      await approveShockBoxes(row.code, row.location, boxes, requestId.current)
      onRecorded()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível salvar.') }
    finally { setSaving(false) }
  }

  return <dialog ref={dialogRef} className="shock-testing-dialog" aria-labelledby="shock-testing-title" onCancel={(event) => { event.preventDefault(); if (!saving) onClose() }}>
    <div className="shock-testing-heading"><div><h2 id="shock-testing-title">Testagem · {row.code}</h2><p>{row.location} · {row.boxes} {row.boxes === 1 ? 'caixa' : 'caixas'} · {row.status}</p></div><button type="button" className="theme-toggle" disabled={saving} onClick={onClose}>Fechar</button></div>
    {!ready ? <p role="status">O registro de aprovação e responsável aguarda ativação no banco. Os saldos atuais permanecem disponíveis no estoque.</p> : <>
      {waiting && canApprove && <form onSubmit={submit} className="shock-approval-form">
        <h3>Registrar caixas aprovadas</h3><p>Confirme somente caixas inteiras que você testou e aprovou. Elas passam de Aguardando testagem para Liberado para venda, no mesmo local.</p>
        <label>Quantidade aprovada (caixas)<input type="number" min="1" max={row.boxes} step="1" required disabled={saving} value={quantity} onChange={(event) => { setQuantity(event.target.value); requestId.current = null; setError('') }} /></label>
        <p>Seu nome e a data/hora serão registrados automaticamente. Caixas reprovadas devem seguir o fluxo de garantia.</p>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button type="submit" className="add-product-button" disabled={saving}>{saving ? 'Registrando…' : 'Confirmar aprovação'}</button>
      </form>}
      <div className="shock-testing-heading"><h3>Histórico de aprovações deste produto</h3><button type="button" className="theme-toggle" disabled={loading || saving} onClick={() => setRevision((value) => value + 1)}>Atualizar testes</button></div>
      <p>Os registros mostram a quantidade e o local na data do teste. Transferências posteriores não mudam esse histórico. Sem etiqueta individual, ele não identifica cada caixa desta linha.</p>
      {loading ? <p role="status">Carregando testes…</p> : result.error ? <p className="auth-error" role="alert">{result.error}</p> : <>
        {result.rows.length === 0 && <p>Nenhuma aprovação com responsável e data registrada para este produto. Os saldos antigos não possuem essas informações.</p>}
        <ol className="shock-approval-list">{result.rows.map((test) => <li key={test.id}>
          <strong>✓ {test.boxes} {test.boxes === 1 ? 'caixa aprovada' : 'caixas aprovadas'}</strong>
          <span>Responsável: {test.actor_display_name}</span><span>Data: {formatDate.format(new Date(test.created_at))} (Bahia)</span><span>Local do teste: {test.location_code}</span>
        </li>)}</ol>
        <nav className="shock-testing-pagination" aria-label="Páginas do histórico de testagem"><button type="button" className="theme-toggle" disabled={page === 0 || saving} onClick={() => setPage((value) => value - 1)}>Anterior</button><span>Página {page + 1}</span><button type="button" className="theme-toggle" disabled={!result.hasNext || saving} onClick={() => setPage((value) => value + 1)}>Próxima</button></nav>
      </>}
    </>}
  </dialog>
}
